import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { encryptWithBackendRsa } from '../../utils/rsa-encryption';
import { PRE_LOGIN_URL_KEY } from '../../constants/navigation-keys';
import { parseBackendErrorString } from '../../utils/error-utils';
import { MOBILE_NUMBER_PATTERN } from '../../constants/validation-patterns';


type AuthView = 'login' | 'signup' | 'forgot' | 'otp';
type ZoneType = 'owner' | 'agent' | 'user';
type ZoneParam = 'OWNER' | 'AGENT' | 'END_USER';
export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]+/.test(value);
    const hasLowerCase = /[a-z]+/.test(value);
    const hasNumeric = /[0-9]+/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);

    const errors: Record<string, boolean> = {};

    if (!hasUpperCase) {
      errors['missingUppercase'] = true;
    }
    if (!hasLowerCase) {
      errors['missingLowercase'] = true;
    }
    if (!hasNumeric) {
      errors['missingNumber'] = true;
    }
    if (!hasSpecial) {
      errors['missingSpecial'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}

@Component({
  selector: 'app-login-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, FormsModule, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './login-signup.html',
  styleUrls: ['./login-signup.css'],
})
export class LoginSignup implements OnInit, OnDestroy {
  authView: AuthView = 'login';

  loginForm: FormGroup = this.buildLoginForm();
  signupForm: FormGroup = this.buildSignupForm();
  forgotForm: FormGroup = this.buildForgotForm();
  showPassword = false;
  showSignupPassword = false;
  showSignupConfirmPassword = false;
  showForgotPassword = false;
  showForgotConfirmPassword = false;
  showSignupOtpSentMessage = false;
  showForgotOtpSentMessage = false;
  showOtpDialog = false;
  otpDialogMessage = '';
  forgotResetToken: string | null = null;
  otpCode = '';
  otpContext: 'signup' | 'forgot' = 'signup';
  pendingMobile?: string;
  signupOtpInput = '';
  forgotOtpInput = '';
  otpRequested = false;
  forgotOtpRequested = false;
  otpVerifiedFlag = false;
  forgotOtpVerified = false;
  signupMobileLocked = false;
  forgotMobileLocked = false;
  signupMobileError: string | null = null;
  // Controls whether password inputs are enabled (false until OTP verified)
  allowPasswordEntry = false;
  private readonly otpVerifiedToastDuration = 6000;
  showSignupOtpVerifiedToast = false;
  showForgotOtpVerifiedToast = false;
  showResendOtpOption = false;
  showForgotResendOption = false;
  forgotUserLookupError: string | null = null;
  zoneType: ZoneType = 'owner';
  showSuccessDialog = false;
  successDialogMessage = '';
  successDialogButtonLabel = 'Go to Login';
  private successDialogAction: (() => void) | null = null;
  private destroy$ = new Subject<void>();
  private signupOtpVerifiedTimer: ReturnType<typeof setTimeout> | null = null;
  private forgotOtpVerifiedTimer: ReturnType<typeof setTimeout> | null = null;
  private lastVerifiedForgotOtp: string | null = null;

  // Loading / UX state flags
  isLoadingLogin = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  isVerifyingForgotOtp = false;
  isRegistering = false;
  isResettingPassword = false;
  // Debug helpers to show last verify-otp payload/time in UI for troubleshooting
  lastVerifyPayload: any = null;
  lastVerifyCallAt: string | null = null;
  // Inline OTP error for user-friendly feedback
  otpError: string | null = null;
  forgotOtpError: string | null = null;

  private readonly zoneLabels: Record<ZoneType, string> = {
    owner: 'Owner Zone',
    agent: 'Agent Zone',
    user: 'User Zone',
  };
  private readonly zoneParamMap: Record<ZoneParam, ZoneType> = {
    OWNER: 'owner',
    AGENT: 'agent',
    END_USER: 'user',
  };

  private readonly zoneClasses: Record<ZoneType, string> = {
    owner: 'owner-zone-link',
    agent: 'agent-zone-link',
    user: 'user-zone-link',
  };

  @Output() loginAttempt = new EventEmitter<{ whatsappNo: string; password: string }>();
  @Output() signupRequest = new EventEmitter<{
    name: string;
    email: string;
    mobile: string;
    password: string;
  }>();
  @Output() forgotPasswordRequest = new EventEmitter<{ mobile: string }>();

  // URL to redirect to after successful login
  private returnUrl: string | null = null;
  @Output() otpSent = new EventEmitter<{ mobile: string; context: 'signup' | 'forgot' }>();
  @Output() otpVerified = new EventEmitter<{ mobile?: string; context: 'signup' | 'forgot' }>();

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private wishlistService: WishlistService,
    private authService: AuthService
  ) { }
  ngOnInit(): void {
    this.forgotForm
      .get('mobile')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.forgotUserLookupError = null;
        this.clearForgotOtpStateForMobileChange();
        this.stripNonDigits(this.forgotForm.get('mobile'), value);
      });

    this.signupForm
      .get('mobile')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.signupMobileError = null;
        this.stripNonDigits(this.signupForm.get('mobile'), value);
      });

    this.signupForm
      .get('name')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const current = value ?? '';
        const normalized = this.normalizeFullName(current);
        if (current !== normalized) {
          this.signupForm.get('name')?.setValue(normalized, { emitEvent: false });
        }
      });

    this.loginForm
      .get('whatsappNo')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.stripNonDigits(this.loginForm.get('whatsappNo'), value);
      });

    this.initializeZoneType();

    const navigation = this.router.getCurrentNavigation();
    const previousUrl = navigation?.extras?.state?.['previousUrl'];
    if (previousUrl && previousUrl !== '/login') {
      this.returnUrl = previousUrl;
    }

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.initializeZoneType(params.get('userType'));
      const returnUrlParam = params.get('returnUrl');
      if (returnUrlParam) {
        this.returnUrl = returnUrlParam;
      } else if (!this.returnUrl) {
        const storedReturnUrl = this.readStoredReturnUrl();
        if (storedReturnUrl) {
          this.returnUrl = storedReturnUrl;
        }
      }
    });
  }

  private openOtpDialog(message: string): void {
    this.otpDialogMessage = message;
    this.showOtpDialog = true;
  }

  closeOtpDialog(): void {
    this.showOtpDialog = false;
    this.otpDialogMessage = '';
  }

  private openSuccessDialog(message: string, action: () => void, actionLabel = 'Go to Login'): void {
    this.successDialogMessage = message;
    this.successDialogAction = action;
    this.successDialogButtonLabel = actionLabel;
    this.showSuccessDialog = true;
  }

  confirmSuccessDialog(): void {
    this.showSuccessDialog = false;
    const action = this.successDialogAction;
    this.successDialogAction = null;
    action?.();
  }

  private navigateToLoginPage(): void {
    this.router
      .navigate(['/login'], { queryParams: { userType: this.zoneType } })
      .catch((err) => console.error('Navigation failed', err));
  }

  private buildLoginForm(): FormGroup {
    return new FormGroup({
      whatsappNo: new FormControl('', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    });
  }

  private buildSignupForm(): FormGroup {
    return new FormGroup({
      name: new FormControl('', [Validators.required, Validators.pattern(/^[^0-9]*$/)]),
      email: new FormControl('', [Validators.email]),
      mobile: new FormControl('', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]),
      password: new FormControl('', [Validators.required, Validators.minLength(6), passwordValidator()]),
      confirmPassword: new FormControl('', [Validators.required]),
    });
  }

  private buildForgotForm(): FormGroup {
    return new FormGroup({
      mobile: new FormControl('', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]),
      newPassword: new FormControl({ value: '', disabled: true }, [Validators.required, Validators.minLength(6), passwordValidator()]),
      confirmPassword: new FormControl({ value: '', disabled: true }, [Validators.required]),
    });
  }

  onSignIn(): void {
    if (this.loginForm.valid) {
      const values = this.loginForm.value;

      // Determine userType from zoneLinkClass (maps CSS class to backend enum)
      const classToEnum: Record<string, string> = {
        'owner-zone-link': 'OWNER',
        'agent-zone-link': 'AGENT',
        'user-zone-link': 'END_USER',
      };
      const zoneClass = this.zoneLinkClass;
      const userType = classToEnum[zoneClass] || 'END_USER';

      // Encrypt login password with server public key then POST to login endpoint
      this.isLoadingLogin = true;
      this.api.getPublicKey().subscribe(async (pubKey: string) => {
        if (!pubKey) {
          this.isLoadingLogin = false;
          this.snackBar.open('Unable to fetch public key. Login cannot proceed.', 'Close', { duration: 4000 });
          return;
        }

        try {
          const encrypted = await this.encryptWithPublicKeyPem(pubKey, values.password);
          const payload = { mobile: values.whatsappNo, password: encrypted, userType };

          this.api.login(payload).subscribe((resp: any) => {
            this.isLoadingLogin = false;
            if (resp && resp.success === false) {
              this.snackBar.open('Login failed: ' + (resp.error || 'Unknown'), 'Close', { duration: 4000 });
              return;
            }
            if (resp && resp.accessToken) {
              try {
                localStorage.setItem('accessToken', resp.accessToken);
                if (resp.refreshToken) localStorage.setItem('refreshToken', resp.refreshToken);
                // Store userId - it may come as a string or number, or might be empty
                // Always store if present (even if empty string to help debug)
                if (resp.userId !== undefined && resp.userId !== null && resp.userId !== '') {
                  localStorage.setItem('userId', String(resp.userId));
                } else {
                  console.warn('userId not returned from login API or is empty');
                }
                localStorage.setItem('userType', userType);
                localStorage.setItem('userMobile', values.whatsappNo);
                console.debug('Login stored:', {
                  userId: localStorage.getItem('userId'),
                  userType: localStorage.getItem('userType'),
                  hasAccessToken: !!resp.accessToken,
                  respUserId: resp.userId
                });
              } catch (e) {
                console.warn('Failed to store tokens locally', e);
              }
              // Schedule auto-logout for the new token
              this.authService.onLogin(resp.accessToken);
              this.loginAttempt.emit({ whatsappNo: values.whatsappNo, password: values.password });
              this.navigateToRole(userType);
              return;
            }
            this.snackBar.open('Login response: ' + JSON.stringify(resp), 'Close', { duration: 4000 });
          });
        } catch (e) {
          this.isLoadingLogin = false;
          console.error('Encryption failed for login', e);
          this.snackBar.open('Encryption failed. Please try again.', 'Close', { duration: 4000 });
        }
      }, (err) => {
        this.isLoadingLogin = false;
        this.snackBar.open('Failed to fetch public key', 'Close', { duration: 4000 });
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onSignupSubmit(): void {
    if (this.signupForm.valid) {
      if (!this.otpVerifiedFlag) {
        return;
      }
      const values = this.signupForm.value;
      if (values.password !== values.confirmPassword) {
        this.signupForm.get('confirmPassword')?.setErrors({ mismatch: true });
        return;
      }

      // Proceed: fetch PEM public key, import as SPKI, encrypt using Web Crypto (RSA-OAEP SHA-256)
      this.isRegistering = true;
      this.api.getPublicKey().subscribe(async (pubKey: string) => {
        if (!pubKey) {
          this.isRegistering = false;
          this.snackBar.open('Unable to fetch public key from server. Registration cannot proceed.', 'Close', { duration: 4000 });
          return;
        }

        let encryptedPassword = values.password;
        try {
          encryptedPassword = await this.encryptWithPublicKeyPem(pubKey, values.password);
        } catch (e) {
          this.isRegistering = false;
          console.error('Encryption failed', e);
          this.snackBar.open('Encryption failed. Please try again later.', 'Close', { duration: 4000 });
          return;
        }

        const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
        const payload = { username: values.name, email: values.email, mobile: values.mobile, password: encryptedPassword, userType: userTypeMap[this.zoneType] };

        this.api.register(payload).subscribe((resp: any) => {
          this.isRegistering = false;
          if (resp && resp.success === false) {
            this.snackBar.open('Registration failed: ' + (resp.error || 'Unknown error'), 'Close', { duration: 4000 });
            return;
          }
          const friendlyZone = this.zoneLabels[this.zoneType] || 'User';
          this.returnToLogin();
          this.openSuccessDialog(
            `${friendlyZone} registered successfully. Please sign in.`,
            () => this.navigateToLoginPage()
          );
          return;
        }, (err) => {
          this.isRegistering = false;
          this.snackBar.open('Registration failed. Please try again.', 'Close', { duration: 4000 });
        });
      }, (err) => {
        this.isRegistering = false;
        this.snackBar.open('Failed to fetch public key', 'Close', { duration: 4000 });
      });
    } else {
      this.signupForm.markAllAsTouched();
    }
  }

  private navigateToRole(userType: string): void {
    if (!userType) {
      return;
    }
    this.wishlistService.refreshForCurrentUser();
    const resolvedReturnUrl = this.resolveReturnUrl();
    this.clearStoredReturnUrl();
    if (resolvedReturnUrl) {
      this.router.navigateByUrl(resolvedReturnUrl).catch((err) => console.warn('Navigation failed', err));
      return;
    }
    // Redirect to appropriate dashboard based on user type instead of home
    const defaultRoute = userType === 'OWNER' ? '/owner-dashboard' : '/dashboard';
    this.router.navigate([defaultRoute]).catch((err) => console.warn('Navigation failed', err));
  }

  private resolveReturnUrl(): string | null {
    const manualCandidate = this.normalizeReturnUrl(this.returnUrl);
    if (manualCandidate) {
      return manualCandidate;
    }
    return this.normalizeReturnUrl(this.readStoredReturnUrl());
  }

  private normalizeReturnUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }
    const basePath = trimmed.split('?')[0];
    // Filter out login page and dashboard routes (user should land on dashboard after login if they came from login page)
    if (basePath === '/login' || basePath === '/dashboard' || basePath === '/owner-dashboard') {
      return null;
    }
    return trimmed;
  }

  private readStoredReturnUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const stored = sessionStorage.getItem(PRE_LOGIN_URL_KEY);
      return stored || null;
    } catch (err) {
      console.warn('Unable to read stored return URL', err);
      return null;
    }
  }

  private clearStoredReturnUrl(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(PRE_LOGIN_URL_KEY);
    } catch (err) {
      console.warn('Unable to clear stored return URL', err);
    }
  }

  // Encrypts the plaintext password with RSA-OAEP parameters that mirror the backend (SHA-256 digest + MGF1 SHA-1).
  private async encryptWithPublicKeyPem(pem: string, plaintext: string): Promise<string> {
    return encryptWithBackendRsa(pem, plaintext);
  }

  startSignupOtpFlow(): void {
    this.requestSignupOtp(false);
  }

  resendSignupOtp(): void {
    this.requestSignupOtp(true);
  }

  private requestSignupOtp(isResend: boolean): void {
    const mobileControl = this.signupForm.get('mobile');
    let mobile = (this.pendingMobile as string) || mobileControl?.value;
    if (typeof mobile === 'string') {
      mobile = mobile.trim();
    }
    if (!mobile) {
      mobileControl?.markAsTouched();
      return;
    }
    if (mobileControl?.invalid && !this.pendingMobile) {
      mobileControl.markAsTouched();
      return;
    }

    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    const payload = { mobile, userType: userTypeMap[this.zoneType], purpose: 'S' };

    this.resetSignupOtpUiFlags();
    this.allowPasswordEntry = false;
    this.signupForm.get('password')?.disable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.disable({ emitEvent: false });
    this.isSendingOtp = true;
    this.api.getOtp(payload).subscribe((resp: any) => {
      this.isSendingOtp = false;
      if (resp && resp.success === false) {
        const message = parseBackendErrorString(resp.error) || parseBackendErrorString(resp) || 'Failed to send OTP.';
        this.signupMobileError = message;
        this.snackBar.open(message, 'Close', { duration: 4000 });
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        this.showSignupOtpSentMessage = false;
        return;
      }
      this.pendingMobile = mobile;
      this.signupOtpInput = '';
      this.otpRequested = true;
      this.otpVerifiedFlag = false;
      this.showSignupOtpSentMessage = true;
      if (resp && resp.message) {
        this.snackBar.open(isResend ? 'OTP resent successfully.' : resp.message, 'Close', { duration: 3000 });
        if (resp.otp) console.log('DEV OTP:', resp.otp);
      }
      this.otpSent.emit({ mobile, context: 'signup' });
      this.openOtpDialog('OTP sent successfully');
    }, (err) => {
      this.isSendingOtp = false;
      const message = parseBackendErrorString(err?.error) || parseBackendErrorString(err) || 'Failed to send OTP. Please try again.';
      this.signupMobileError = message;
      this.signupForm.get('password')?.enable({ emitEvent: false });
      this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
      this.showSignupOtpSentMessage = false;
      this.snackBar.open(message, 'Close', { duration: 4000 });
    });
  }

  startForgotOtpFlow(): void {
    this.requestForgotOtp(false);
  }

  resendForgotOtp(): void {
    this.requestForgotOtp(true);
  }

  private requestForgotOtp(isResend: boolean): void {
    const mobileControl = this.forgotForm.get('mobile');
    let mobile = mobileControl?.value;
    if (typeof mobile === 'string') {
      mobile = mobile.trim();
    }

    if (!mobile || mobileControl?.invalid) {
      mobileControl?.markAsTouched();
      return;
    }

    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    const payload = { mobile, userType: userTypeMap[this.zoneType], purpose: 'F' };

    this.resetForgotOtpUiFlags();
    this.forgotUserLookupError = null;
    this.otpContext = 'forgot';
    this.pendingMobile = mobile;
    this.isSendingOtp = true;
    this.api.getOtp(payload).subscribe((resp: any) => {
      this.isSendingOtp = false;
      if (resp && resp.success === false) {
        const errorMessage = parseBackendErrorString(resp.error) || parseBackendErrorString(resp) || 'Please verify the number/role; account not found.';
        this.forgotUserLookupError = errorMessage;
        this.showForgotOtpSentMessage = false;
        const toastMessage = errorMessage && errorMessage.toLowerCase().includes('no user')
          ? 'User not found / Invalid Number'
          : errorMessage;
        this.snackBar.open(toastMessage, 'Close', { duration: 4000 });
        return;
      }
      const responseMessage: string = (
        resp &&
        ([resp.message, resp.error, resp?.data?.message, resp?.data?.error].find(
          (msg) => typeof msg === 'string' && msg.trim().length
        ) as string | undefined)
      ) || '';
      const messageLower = responseMessage.toLowerCase();
      const indicatesMissingUser =
        messageLower.includes('not exist') ||
        messageLower.includes('not found') ||
        messageLower.includes('no user found');
      if (indicatesMissingUser) {
        const friendly = responseMessage || 'User with this role/number does not exist.';
        this.forgotUserLookupError = friendly;
        this.showForgotOtpSentMessage = false;
        this.snackBar.open(friendly, 'Close', { duration: 4000 });
        return;
      }
      this.forgotOtpInput = '';
      this.forgotOtpRequested = true;
      this.forgotOtpVerified = false;
      this.showForgotOtpSentMessage = true;
      if (resp && resp.message) {
        this.snackBar.open(isResend ? 'OTP resent successfully.' : resp.message, 'Close', { duration: 3000 });
        if (resp.otp) console.log('DEV OTP:', resp.otp);
      }
      this.otpSent.emit({ mobile, context: 'forgot' });
      this.openOtpDialog('OTP sent successfully to registered WhatsApp number');
    }, (err) => {
      this.isSendingOtp = false;
      const errMsg = parseBackendErrorString(err?.error) || parseBackendErrorString(err) || 'Failed to send OTP. Please try again.';
      this.forgotUserLookupError = errMsg;
      this.showForgotOtpSentMessage = false;
      this.snackBar.open('Failed to send OTP: ' + errMsg, 'Close', { duration: 4000 });
      console.error('Forgot OTP request failed', errMsg);
    });
  }

  verifySignupOtp(): void {
    if (this.signupOtpInput.trim().length < 4) {
      this.signupOtpInput = this.signupOtpInput.trim();
      return;
    }
    // clear previous OTP error
    this.otpError = null;
    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    let mobile = (this.pendingMobile as string) || this.signupForm.get('mobile')?.value;
    // Fallback to DOM input value if form/control isn't populated for any reason
    if (!mobile) {
      try {
        const el = document.getElementById('signup-mobile') as HTMLInputElement | null;
        if (el && el.value) mobile = el.value.trim();
      } catch (e) {
        // ignore in non-browser env
      }
    }
    const otp = this.signupOtpInput.trim();
    const payload = { mobile, userType: userTypeMap[this.zoneType], otp, purpose: 'S' };

    // Validate payload before sending
    if (!payload.mobile || !payload.userType || !payload.otp || !payload.purpose) {
      this.snackBar.open('Missing required OTP fields. Please request OTP again and retry.', 'Close', { duration: 4000 });
      console.warn('verifySignupOtp aborted due to missing fields', payload);
      return;
    }

    console.debug('verifySignupOtp payload ->', payload);
    this.lastVerifyPayload = payload;
    this.lastVerifyCallAt = new Date().toISOString();
    this.isVerifyingOtp = true;
    console.debug('Calling ApiService.verifyOtp...');
    this.api.verifyOtp(payload).subscribe((resp: any) => {
      this.isVerifyingOtp = false;
      const verified = this.isOtpVerifiedResponse(resp);
      if (verified) {
        this.otpError = null;
        this.otpVerifiedFlag = true;
        this.otpRequested = false;
        this.allowPasswordEntry = true;
        this.showSignupOtpSentMessage = false;
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        this.signupOtpInput = '';
        this.showResendOtpOption = false;
        this.triggerOtpVerifiedToast('signup');
        this.otpVerified.emit({ mobile: this.pendingMobile, context: 'signup' });
        this.signupMobileLocked = true;
        this.snackBar.open('OTP verified', 'Close', { duration: 2000 });
        this.openOtpDialog('WhatsApp number verified successfully!');
        // Debug: show resulting states so it's easy to confirm in browser console
        console.debug('verifySignupOtp: enabled password controls', {
          allowPasswordEntry: this.allowPasswordEntry,
          passwordDisabled: this.signupForm.get('password')?.disabled,
          confirmDisabled: this.signupForm.get('confirmPassword')?.disabled,
        });
        return;
      }
      // extract message from response body when backend returns { status, body }
      const respBody = resp && resp.body ? resp.body : resp;
      const errMsg = parseBackendErrorString(respBody) || 'Invalid OTP';
      this.otpError = errMsg;
      this.showSignupOtpSentMessage = false;
      this.showResendOtpOption = true;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    }, (err) => {
      this.isVerifyingOtp = false;
      const errMsg = parseBackendErrorString(err) || 'Server error';
      this.otpError = errMsg;
      this.showSignupOtpSentMessage = false;
      this.showResendOtpOption = true;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  verifyForgotOtp(): void {
    if (this.forgotOtpInput.trim().length < 4) {
      this.forgotOtpInput = this.forgotOtpInput.trim();
      return;
    }
    this.forgotOtpError = null;
    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    let mobile = (this.pendingMobile as string) || this.forgotForm.get('mobile')?.value;
    if (!mobile) {
      try {
        const el = document.getElementById('forgot-mobile') as HTMLInputElement | null;
        if (el && el.value) mobile = el.value.trim();
      } catch (e) {
        /* ignore non-browser env */
      }
    }
    if (typeof mobile === 'string') {
      mobile = mobile.trim();
    }
    const otp = this.forgotOtpInput.trim();
    const payload = { mobile, userType: userTypeMap[this.zoneType], otp, purpose: 'F' };

    if (!payload.mobile || !payload.userType || !payload.otp || !payload.purpose) {
      this.snackBar.open('Missing required OTP fields. Please request OTP again and retry.', 'Close', { duration: 4000 });
      console.warn('verifyForgotOtp aborted due to missing fields', payload);
      return;
    }

    this.pendingMobile = payload.mobile;
    this.isVerifyingForgotOtp = true;
    this.api.verifyOtp(payload).subscribe((resp: any) => {
      this.isVerifyingForgotOtp = false;
      const respBody = resp && resp.body ? resp.body : resp;
      const verified = this.isOtpVerifiedResponse(resp);
      if (verified) {
        this.forgotOtpError = null;
        this.forgotOtpVerified = true;
        this.forgotOtpRequested = false;
        this.showForgotOtpSentMessage = false;
        this.forgotResetToken = this.extractResetToken(respBody);
        this.enableForgotPasswordFields();
        this.lastVerifiedForgotOtp = otp;
        this.forgotOtpInput = '';
        this.showForgotResendOption = false;
        this.triggerOtpVerifiedToast('forgot');
        this.otpVerified.emit({ mobile: this.pendingMobile, context: 'forgot' });
        this.forgotMobileLocked = true;
        this.snackBar.open('OTP verified', 'Close', { duration: 2000 });
        this.openOtpDialog('WhatsApp number verified successfully!');
        return;
      }

      const errMsg = parseBackendErrorString(respBody) || 'Invalid OTP';
      this.forgotOtpError = errMsg;
      this.showForgotOtpSentMessage = false;
      this.showForgotResendOption = true;
      this.forgotResetToken = null;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    }, (err) => {
      this.isVerifyingForgotOtp = false;
      const errMsg = parseBackendErrorString(err) || 'Server error';
      this.forgotOtpError = errMsg;
      this.showForgotOtpSentMessage = false;
      this.showForgotResendOption = true;
      this.forgotResetToken = null;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  onResetPassword(): void {
    this.forgotForm.markAllAsTouched();
    if (!this.forgotOtpVerified) {
      this.snackBar.open('Please verify the OTP before resetting your password.', 'Close', { duration: 4000 });
      return;
    }

    const newPasswordControl = this.forgotForm.get('newPassword');
    const confirmPasswordControl = this.forgotForm.get('confirmPassword');
    const mobileControl = this.forgotForm.get('mobile');

    if (!newPasswordControl || !confirmPasswordControl || !mobileControl) {
      return;
    }

    if (newPasswordControl.invalid || confirmPasswordControl.invalid || mobileControl.invalid) {
      return;
    }

    const newPassword = newPasswordControl.value;
    const confirmPassword = confirmPasswordControl.value;
    confirmPasswordControl.setErrors(null);
    if (newPassword !== confirmPassword) {
      confirmPasswordControl.setErrors({ mismatch: true });
      confirmPasswordControl.markAsTouched();
      return;
    }

    if (!this.lastVerifiedForgotOtp) {
      this.snackBar.open('Missing OTP verification. Please verify again.', 'Close', { duration: 4000 });
      return;
    }

    if (!this.forgotResetToken) {
      this.snackBar.open('Missing reset authorization token. Please verify the OTP again.', 'Close', { duration: 4000 });
      return;
    }

    const mobile = ((this.pendingMobile as string) || mobileControl.value || '').trim();
    if (!mobile) {
      this.snackBar.open('Mobile number missing. Please re-enter and request OTP again.', 'Close', { duration: 4000 });
      return;
    }

    this.isResettingPassword = true;
    this.api.getPublicKey().subscribe(async (pubKey: string) => {
      if (!pubKey) {
        this.isResettingPassword = false;
        this.snackBar.open('Unable to fetch public key. Reset cannot proceed.', 'Close', { duration: 4000 });
        return;
      }

      let encryptedPassword = newPassword;
      try {
        encryptedPassword = await this.encryptWithPublicKeyPem(pubKey, newPassword);
      } catch (e) {
        this.isResettingPassword = false;
        console.error('Encryption failed for reset password', e);
        this.snackBar.open('Encryption failed. Please try again later.', 'Close', { duration: 4000 });
        return;
      }

      const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
      const payload = {
        mobile,
        otp: this.lastVerifiedForgotOtp as string,
        newPassword: encryptedPassword,
        userType: userTypeMap[this.zoneType],
      };

      this.api.resetPassword(payload, { authorizationToken: this.forgotResetToken || undefined }).subscribe((resp: any) => {
        this.isResettingPassword = false;
        if (resp && resp.success === false) {
          this.snackBar.open('Password reset failed: ' + (resp.error || 'Unknown error'), 'Close', { duration: 4000 });
          return;
        }
        this.returnToLogin();
        this.openSuccessDialog('Password reset successful. Please sign in.', () => this.navigateToLoginPage());
      }, (err) => {
        this.isResettingPassword = false;
        const errMsg = (err && err.error && (err.error.message || err.error.error)) || err.message || 'Server error';
        this.snackBar.open('Password reset failed: ' + errMsg, 'Close', { duration: 4000 });
      });
    }, (err) => {
      this.isResettingPassword = false;
      const errMsg = (err && err.error && (err.error.message || err.error.error)) || err.message || 'Server error';
      this.snackBar.open('Failed to fetch public key: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  prepareOtp(context: 'signup' | 'forgot', mobile: string): void {
    this.otpContext = context;
    this.pendingMobile = mobile;
    this.authView = 'otp';
    this.otpCode = '';
    this.otpSent.emit({ mobile, context });
  }

  confirmOtp(): void {
    if (this.otpCode.trim().length < 4) {
      this.otpCode = this.otpCode.trim();
      return;
    }

    // Map zoneType to backend enum names
    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    let mobile = (this.pendingMobile as string) || this.forgotForm.get('mobile')?.value || this.signupForm.get('mobile')?.value;
    if (!mobile) {
      try {
        const el1 = document.getElementById('forgot-mobile') as HTMLInputElement | null;
        const el2 = document.getElementById('signup-mobile') as HTMLInputElement | null;
        if (el1 && el1.value) mobile = el1.value.trim();
        else if (el2 && el2.value) mobile = el2.value.trim();
      } catch (e) {
        // ignore
      }
    }
    const purpose = this.otpContext === 'signup' ? 'S' : 'F';
    const payload = { mobile, userType: userTypeMap[this.zoneType], otp: this.otpCode.trim(), purpose };

    if (!payload.mobile || !payload.userType || !payload.otp || !payload.purpose) {
      this.snackBar.open('Missing required OTP fields. Please request OTP again and retry.', 'Close', { duration: 4000 });
      console.warn('confirmOtp aborted due to missing fields', payload);
      return;
    }

    console.debug('confirmOtp payload ->', payload);
    this.isVerifyingOtp = true;
    console.debug('Calling ApiService.verifyOtp from confirmOtp...');
    this.api.verifyOtp(payload).subscribe((resp: any) => {
      this.isVerifyingOtp = false;
      const verified = this.isOtpVerifiedResponse(resp);
      console.debug('confirmOtp response', { resp, verified });
      if (verified) {
        // Enable password entry on the OTP page and allow user to continue registration
        this.otpError = null;
        this.allowPasswordEntry = true;
        this.otpRequested = false;
        this.otpVerifiedFlag = true;
        // ensure form controls are enabled so they can type password on OTP page
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        this.otpVerified.emit({ mobile: this.pendingMobile, context: this.otpContext });
        this.snackBar.open('OTP verified! You can now enter your password below.', 'Close', { duration: 2500 });
        console.debug('OTP verified — password enabled', {
          allowPasswordEntry: this.allowPasswordEntry,
          passwordDisabled: this.signupForm.get('password')?.disabled,
        });
        return;
      }
      const respBody = resp && resp.body ? resp.body : resp;
      const errMsg = parseBackendErrorString(respBody) || 'Invalid OTP';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    }, (err) => {
      this.isVerifyingOtp = false;
      const errMsg = parseBackendErrorString(err) || 'Server error';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  // Normalize verify-otp response shapes from backend
  private isOtpVerifiedResponse(resp: any): boolean {
    if (!resp) return false;
    // If API returns { status, body } (we now return full response for verifyOtp), prefer status
    if (typeof resp.status === 'number') {
      return resp.status === 200;
    }
    if (resp.verified === true) return true;
    if (resp.success === true) return true;
    if (typeof resp.message === 'string' && resp.message.toLowerCase().includes('verified')) return true;
    return false;
  }

  resendOtp(): void {
    if (this.otpContext === 'signup') {
      this.resendSignupOtp();
      return;
    }
    if (this.otpContext === 'forgot') {
      this.resendForgotOtp();
      return;
    }
    if (this.pendingMobile) {
      console.log('Resending OTP to', this.pendingMobile);
      this.otpSent.emit({ mobile: this.pendingMobile, context: this.otpContext });
    }
  }

  switchView(view: AuthView): void {
    this.authView = view;
    if (view === 'signup') {
      this.resetSignupOtpUiFlags();
    }
    if (view === 'forgot') {
      this.resetForgotOtpUiFlags();
    }
  }

  returnToLogin(): void {
    this.authView = 'login';
    this.otpCode = '';
    this.pendingMobile = undefined;
    this.otpRequested = false;
    this.otpVerifiedFlag = false;
    this.allowPasswordEntry = false;
    this.resetSignupOtpUiFlags();
    this.resetForgotOtpUiFlags();
    this.signupForm.get('password')?.enable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
  }

  private normalizeFullName(value: string | null): string {
    if (!value) {
      return '';
    }
    const withoutDigits = value.replace(/\d/g, '');
    return withoutDigits.replace(/\b([A-Za-z])/g, (match) => {
      return match.toUpperCase();
    });
  }

  private stripNonDigits(control: AbstractControl | null, value: string | null): void {
    if (!control || typeof value !== 'string') {
      return;
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly !== value) {
      control.setValue(digitsOnly, { emitEvent: false });
    }
  }

  get loginControls() {
    return this.loginForm.controls;
  }

  get f() {
    return this.loginControls;
  }

  get signupControls() {
    return this.signupForm.controls;
  }

  get forgotControls() {
    return this.forgotForm.controls;
  }

  // Backwards compatibility for older template bindings still referencing the old flag name.
  get showOtpVerifiedToast(): boolean {
    return this.showSignupOtpVerifiedToast;
  }

  set showOtpVerifiedToast(value: boolean) {
    this.showSignupOtpVerifiedToast = value;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleSignupPasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showSignupPassword = !this.showSignupPassword;
    } else {
      this.showSignupConfirmPassword = !this.showSignupConfirmPassword;
    }
  }

  toggleForgotPasswordVisibility(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showForgotPassword = !this.showForgotPassword;
    } else {
      this.showForgotConfirmPassword = !this.showForgotConfirmPassword;
    }
  }

  get passwordErrorMessage(): string | null {
    const control = this.loginForm.get('password');
    const errors = control?.errors;

    if (!errors) {
      return null;
    }

    if (errors['required']) {
      return 'Password is required.';
    }
    if (errors['minlength']) {
      return 'Password must be at least 6 characters.';
    }
    if (errors['missingUppercase']) {
      return 'Password must include at least one uppercase letter.';
    }
    if (errors['missingLowercase']) {
      return 'Password must include at least one lowercase letter.';
    }
    if (errors['missingNumber']) {
      return 'Password must include at least one number.';
    }
    if (errors['missingSpecial']) {
      return 'Password must include at least one special character.';
    }

    return null;
  }

  get signupPasswordErrorMessage(): string | null {
    const control = this.signupForm.get('password');
    const errors = control?.errors;

    if (!errors) {
      return null;
    }

    if (errors['missingUppercase']) {
      return 'Password must include at least one uppercase letter.';
    }
    if (errors['missingLowercase']) {
      return 'Password must include at least one lowercase letter.';
    }
    if (errors['missingNumber']) {
      return 'Password must include at least one number.';
    }
    if (errors['missingSpecial']) {
      return 'Password must include at least one special character.';
    }

    return null;
  }

  get forgotPasswordErrorMessage(): string | null {
    const control = this.forgotForm.get('newPassword');
    const errors = control?.errors;

    if (!errors) {
      return null;
    }

    if (errors['missingUppercase']) {
      return 'Password must include at least one uppercase letter.';
    }
    if (errors['missingLowercase']) {
      return 'Password must include at least one lowercase letter.';
    }
    if (errors['missingNumber']) {
      return 'Password must include at least one number.';
    }
    if (errors['missingSpecial']) {
      return 'Password must include at least one special character.';
    }

    return null;
  }

  get zoneLinkLabel(): string {
    return this.zoneLabels[this.zoneType];
  }

  get zoneLinkClass(): string {
    return this.zoneClasses[this.zoneType];
  }

  private initializeZoneType(queryParam?: string | null): void {
    const rawType = queryParam ?? this.route.snapshot.queryParamMap.get('userType');
    const normalized = rawType ? rawType.toUpperCase() : undefined;
    if (normalized && Object.prototype.hasOwnProperty.call(this.zoneParamMap, normalized)) {
      this.zoneType = this.zoneParamMap[normalized as ZoneParam];
      return;
    }
    this.zoneType = 'owner';
  }
  ngOnDestroy(): void {
    if (this.signupOtpVerifiedTimer) {
      clearTimeout(this.signupOtpVerifiedTimer);
      this.signupOtpVerifiedTimer = null;
    }
    if (this.forgotOtpVerifiedTimer) {
      clearTimeout(this.forgotOtpVerifiedTimer);
      this.forgotOtpVerifiedTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private triggerOtpVerifiedToast(context: 'signup' | 'forgot'): void {
    if (context === 'signup') {
      this.showSignupOtpVerifiedToast = true;
      if (this.signupOtpVerifiedTimer) {
        clearTimeout(this.signupOtpVerifiedTimer);
      }
      this.signupOtpVerifiedTimer = setTimeout(() => {
        this.showSignupOtpVerifiedToast = false;
        this.signupOtpVerifiedTimer = null;
      }, this.otpVerifiedToastDuration);
      return;
    }

    this.showForgotOtpVerifiedToast = true;
    if (this.forgotOtpVerifiedTimer) {
      clearTimeout(this.forgotOtpVerifiedTimer);
    }
    this.forgotOtpVerifiedTimer = setTimeout(() => {
      this.showForgotOtpVerifiedToast = false;
      this.forgotOtpVerifiedTimer = null;
    }, this.otpVerifiedToastDuration);
  }

  private resetSignupOtpUiFlags(): void {
    this.signupMobileLocked = false;
    this.showSignupOtpVerifiedToast = false;
    this.showResendOtpOption = false;
    this.otpError = null;
    this.otpRequested = false;
    this.showSignupOtpSentMessage = false;
    if (this.signupOtpVerifiedTimer) {
      clearTimeout(this.signupOtpVerifiedTimer);
      this.signupOtpVerifiedTimer = null;
    }
  }

  private resetForgotOtpUiFlags(): void {
    this.forgotMobileLocked = false;
    this.showForgotOtpVerifiedToast = false;
    this.showForgotResendOption = false;
    this.forgotOtpError = null;
    this.forgotOtpRequested = false;
    this.forgotOtpVerified = false;
    this.forgotOtpInput = '';
    this.lastVerifiedForgotOtp = null;
    this.forgotUserLookupError = null;
    this.showForgotOtpSentMessage = false;
    this.forgotResetToken = null;
    if (this.forgotOtpVerifiedTimer) {
      clearTimeout(this.forgotOtpVerifiedTimer);
      this.forgotOtpVerifiedTimer = null;
    }
    this.disableForgotPasswordFields();
  }

  private enableForgotPasswordFields(): void {
    if (!this.forgotForm) {
      return;
    }
    this.forgotForm.get('newPassword')?.enable({ emitEvent: false });
    this.forgotForm.get('confirmPassword')?.enable({ emitEvent: false });
  }

  private disableForgotPasswordFields(): void {
    if (!this.forgotForm) {
      return;
    }
    const newPasswordControl = this.forgotForm.get('newPassword');
    const confirmPasswordControl = this.forgotForm.get('confirmPassword');
    newPasswordControl?.disable({ emitEvent: false });
    confirmPasswordControl?.disable({ emitEvent: false });
    newPasswordControl?.reset('', { emitEvent: false });
    confirmPasswordControl?.reset('', { emitEvent: false });
  }

  private clearForgotOtpStateForMobileChange(): void {
    this.forgotMobileLocked = false;
    this.forgotOtpRequested = false;
    this.forgotOtpVerified = false;
    this.forgotOtpInput = '';
    this.forgotOtpError = null;
    this.showForgotResendOption = false;
    this.showForgotOtpVerifiedToast = false;
    this.showForgotOtpSentMessage = false;
    this.forgotResetToken = null;
    this.disableForgotPasswordFields();
  }

  private extractResetToken(body: any): string | null {
    if (!body) {
      return null;
    }
    const candidates = [
      body.resetToken,
      body.token,
      body?.data?.resetToken,
      body?.data?.token,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length) {
        return candidate.trim();
      }
    }
    return null;
  }

}
