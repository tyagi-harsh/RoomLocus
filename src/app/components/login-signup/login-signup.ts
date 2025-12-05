import { Component, EventEmitter, OnInit, Output } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TokenDialogComponent } from './token-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api';

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
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, FormsModule, MatSnackBarModule, MatProgressSpinnerModule, MatDialogModule, TokenDialogComponent],
  templateUrl: './login-signup.html',
  styleUrls: ['./login-signup.css'],
})
export class LoginSignup implements OnInit {
  authView: AuthView = 'login';

  loginForm!: FormGroup;
  signupForm!: FormGroup;
  forgotForm!: FormGroup;
  showPassword = false;
  showSignupPassword = false;
  showSignupConfirmPassword = false;
  otpCode = '';
  otpContext: 'signup' | 'forgot' = 'signup';
  pendingMobile?: string;
  signupOtpInput = '';
  otpRequested = false;
  otpVerifiedFlag = false;
  // Controls whether password inputs are enabled (false until OTP verified)
  allowPasswordEntry = false;
  zoneType: ZoneType = 'owner';

  // Loading / UX state flags
  isLoadingLogin = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  isRegistering = false;
  // Debug helpers to show last verify-otp payload/time in UI for troubleshooting
  lastVerifyPayload: any = null;
  lastVerifyCallAt: string | null = null;
  // Inline OTP error for user-friendly feedback
  otpError: string | null = null;

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
  @Output() otpSent = new EventEmitter<{ mobile: string; context: 'signup' | 'forgot' }>();
  @Output() otpVerified = new EventEmitter<{ mobile?: string; context: 'signup' | 'forgot' }>();

  constructor(private route: ActivatedRoute, private api: ApiService, private snackBar: MatSnackBar, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loginForm = new FormGroup({
      whatsappNo: new FormControl('', [Validators.required, Validators.pattern('^[0-9]{10}$')]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    });

    this.signupForm = new FormGroup({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      mobile: new FormControl('', [Validators.required, Validators.pattern('^[0-9]{10}$')]),
      password: new FormControl('', [Validators.required, Validators.minLength(6), passwordValidator()]),
      confirmPassword: new FormControl('', [Validators.required]),
    });

    this.forgotForm = new FormGroup({
      mobile: new FormControl('', [Validators.required, Validators.pattern('^[0-9]{10}$')]),
    });

    this.initializeZoneType();
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
              } catch (e) {
                console.warn('Failed to store tokens locally', e);
              }
              this.loginAttempt.emit({ whatsappNo: values.whatsappNo, password: values.password });
              // Show dialog with tokens
              try {
                this.dialog.open(TokenDialogComponent, { data: { title: 'Login successful', accessToken: resp.accessToken, refreshToken: resp.refreshToken } });
              } catch (e) {
                // Fallback to snackbar if dialog fails
                this.snackBar.open('Login successful', 'Close', { duration: 2500 });
              }
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
          if (resp && resp.accessToken) {
            try {
              localStorage.setItem('accessToken', resp.accessToken);
              if (resp.refreshToken) localStorage.setItem('refreshToken', resp.refreshToken);
            } catch (e) {
              console.warn('Failed to store tokens locally', e);
            }
            // Show registration success dialog with id if returned
            try {
              this.dialog.open(TokenDialogComponent, { data: { title: 'Registration successful', message: 'Registered successfully', id: resp.id, username: resp.username } });
            } catch (e) {
              this.snackBar.open('Registration successful. You are signed in.', 'Close', { duration: 3000 });
            }
            this.returnToLogin();
            return;
          }
          this.snackBar.open('Registration result: ' + JSON.stringify(resp), 'Close', { duration: 4000 });
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

  // Convert PEM public key (SPKI) to CryptoKey and encrypt plaintext using RSA-OAEP with SHA-256.
  private async encryptWithPublicKeyPem(pem: string, plaintext: string): Promise<string> {
    // Strip the header/footer and newlines, then base64 -> ArrayBuffer
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
    const binaryDer = this.base64ToArrayBuffer(b64);

    // Import the public key as SPKI
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' },
      },
      false,
      ['encrypt']
    );

    // Encode plaintext and encrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data);

    return this.arrayBufferToBase64(encrypted);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
    }
    return btoa(binary);
  }

  startSignupOtpFlow(): void {
    const mobileControl = this.signupForm.get('mobile');
    if (mobileControl?.invalid) {
      mobileControl.markAsTouched();
      return;
    }
    const mobile = mobileControl?.value;
    // Map zoneType to backend enum names
    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    const payload = { mobile, userType: userTypeMap[this.zoneType], purpose: 'S' };

    // Disable password fields while OTP is pending and disallow manual entry
    this.allowPasswordEntry = false;
    this.signupForm.get('password')?.disable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.disable({ emitEvent: false });
    this.isSendingOtp = true;
    this.api.getOtp(payload).subscribe((resp: any) => {
      this.isSendingOtp = false;
      if (resp && resp.success === false) {
        this.snackBar.open('Failed to send OTP: ' + (resp.error || 'Unknown'), 'Close', { duration: 4000 });
        // Re-enable inputs
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        return;
      }
      this.pendingMobile = mobile;
      this.signupOtpInput = '';
      this.otpRequested = true;
      this.otpVerifiedFlag = false;
      this.allowPasswordEntry = false;
      if (resp && resp.message) {
        // show small toast — in dev the OTP is returned for testing
        this.snackBar.open(resp.message, 'Close', { duration: 3000 });
        if (resp.otp) console.log('DEV OTP:', resp.otp);
      }
      this.otpSent.emit({ mobile, context: 'signup' });
    }, (err) => {
      this.isSendingOtp = false;
      this.signupForm.get('password')?.enable({ emitEvent: false });
      this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
      this.snackBar.open('Failed to send OTP. Please try again.', 'Close', { duration: 4000 });
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
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        this.otpVerified.emit({ mobile: this.pendingMobile, context: 'signup' });
        this.snackBar.open('OTP verified', 'Close', { duration: 2000 });
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
      const errMsg = (respBody && (respBody.error || respBody.message)) || 'Invalid OTP';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    }, (err) => {
      this.isVerifyingOtp = false;
      const errMsg = (err && err.error && (err.error.message || err.error.error)) || err.message || 'Server error';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  onForgotSubmit(): void {
    if (this.forgotForm.valid) {
      const { mobile } = this.forgotForm.value;
      // Map zoneType to backend enum names
      const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
      const payload = { mobile, userType: userTypeMap[this.zoneType], purpose: 'F' };
      this.isSendingOtp = true;
      this.api.getOtp(payload).subscribe((resp: any) => {
        this.isSendingOtp = false;
        if (resp && resp.success === false) {
          this.snackBar.open('Failed to send OTP: ' + (resp.error || 'Unknown'), 'Close', { duration: 4000 });
          return;
        }
        this.prepareOtp('forgot', mobile);
        if (resp && resp.message) this.snackBar.open(resp.message, 'Close', { duration: 3000 });
      }, (err) => {
        this.isSendingOtp = false;
        this.snackBar.open('Failed to send OTP. Please try again.', 'Close', { duration: 4000 });
      });
    } else {
      this.forgotForm.markAllAsTouched();
    }
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
      const errMsg = (respBody && (respBody.error || respBody.message)) || 'Invalid OTP';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    }, (err) => {
      this.isVerifyingOtp = false;
      const errMsg = (err && err.error && (err.error.message || err.error.error)) || err.message || 'Server error';
      this.otpError = errMsg;
      this.snackBar.open('OTP verification failed: ' + errMsg, 'Close', { duration: 4000 });
    });
  }

  // Debug helper: directly call verify-otp and log results (useful if template click not wired)
  debugCallVerify(): void {
    const userTypeMap: Record<ZoneType, string> = { owner: 'OWNER', agent: 'AGENT', user: 'END_USER' };
    // Try several fallbacks for mobile: pendingMobile -> reactive form -> DOM input values
    let mobile = (this.pendingMobile as string) || this.signupForm.get('mobile')?.value || this.forgotForm.get('mobile')?.value;
    if (!mobile) {
      try {
        const el1 = document.getElementById('signup-mobile') as HTMLInputElement | null;
        const el2 = document.getElementById('forgot-mobile') as HTMLInputElement | null;
        if (el1 && el1.value) mobile = el1.value.trim();
        else if (el2 && el2.value) mobile = el2.value.trim();
      } catch (e) {
        // ignore in non-browser env
      }
    }

    // Try several fallbacks for OTP: component property bound by ngModel -> DOM input
    let otp = (this.signupOtpInput || '').trim();
    if (!otp) {
      try {
        const otpEl = document.getElementById('signup-otp') as HTMLInputElement | null;
        if (otpEl && otpEl.value) otp = otpEl.value.trim();
      } catch (e) {
        // ignore
      }
    }

    const payload = { mobile, userType: userTypeMap[this.zoneType], otp, purpose: 'S' };
    if (!payload.mobile || !payload.userType || !payload.otp || !payload.purpose) {
      this.snackBar.open('Missing required OTP fields. Please request OTP first.', 'Close', { duration: 4000 });
      console.warn('debugCallVerify aborted due to missing fields', payload);
      return;
    }
    console.debug('debugCallVerify ->', payload);
    // update debug UI so developer can see what was actually sent
    this.lastVerifyPayload = payload;
    this.lastVerifyCallAt = new Date().toISOString();
    this.api.verifyOtp(payload).subscribe((resp: any) => {
      console.debug('debug verify-otp response', resp);
      const verified = this.isOtpVerifiedResponse(resp);
      console.debug('debug verify-otp verified:', verified);
      if (verified) {
        this.otpError = null;
        this.allowPasswordEntry = true;
        this.signupForm.get('password')?.enable({ emitEvent: false });
        this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
        this.otpVerifiedFlag = true;
        this.snackBar.open('Debug: OTP verified (password enabled)', 'Close', { duration: 3000 });
        console.debug('Debug: password enabled state', { disabled: this.signupForm.get('password')?.disabled });
      } else {
        const errMsg = (resp && (resp.error || resp.message)) || 'Invalid OTP';
        this.otpError = errMsg;
        this.snackBar.open('Debug: OTP not verified - ' + errMsg, 'Close', { duration: 4000 });
      }
    }, (err) => {
      console.error('debug verify-otp error', err);
      const errMsg = (err && err.error && (err.error.message || err.error.error)) || err.message || 'Server error';
      this.otpError = errMsg;
      this.snackBar.open('Debug verify-otp failed (see console): ' + errMsg, 'Close', { duration: 4000 });
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
    if (this.pendingMobile) {
      console.log('Resending OTP to', this.pendingMobile);
      this.otpSent.emit({ mobile: this.pendingMobile, context: this.otpContext });
    }
  }

  switchView(view: AuthView): void {
    this.authView = view;
  }

  returnToLogin(): void {
    this.authView = 'login';
    this.otpCode = '';
    this.pendingMobile = undefined;
    this.otpRequested = false;
    this.otpVerifiedFlag = false;
    this.allowPasswordEntry = false;
    this.signupForm.get('password')?.enable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
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

  get zoneLinkLabel(): string {
    return this.zoneLabels[this.zoneType];
  }

  get zoneLinkClass(): string {
    return this.zoneClasses[this.zoneType];
  }

  private initializeZoneType(): void {
    const rawType = this.route.snapshot.queryParamMap.get('userType');
    const normalized = rawType ? rawType.toUpperCase() : undefined;
    if (normalized && Object.prototype.hasOwnProperty.call(this.zoneParamMap, normalized)) {
      this.zoneType = this.zoneParamMap[normalized as ZoneParam];
      return;
    }
    this.zoneType = 'owner';
  }
}
