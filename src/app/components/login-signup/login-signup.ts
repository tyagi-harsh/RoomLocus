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

type AuthView = 'login' | 'signup' | 'forgot' | 'otp';

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
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, FormsModule],
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

  constructor() {}

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
  }

  onSignIn(): void {
    if (this.loginForm.valid) {
      console.log('Login:', this.loginForm.value);
      this.loginAttempt.emit(this.loginForm.value);
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
      const payload = {
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        password: values.password,
      };
      this.signupRequest.emit(payload);
      this.prepareOtp('signup', values.mobile);
    } else {
      this.signupForm.markAllAsTouched();
    }
  }

  startSignupOtpFlow(): void {
    const mobileControl = this.signupForm.get('mobile');
    if (mobileControl?.invalid) {
      mobileControl.markAsTouched();
      return;
    }
    const mobile = mobileControl?.value;
    this.pendingMobile = mobile;
    this.signupOtpInput = '';
    this.otpRequested = true;
    this.otpVerifiedFlag = false;
    this.otpSent.emit({ mobile, context: 'signup' });
    this.signupForm.get('password')?.disable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.disable({ emitEvent: false });
  }

  verifySignupOtp(): void {
    if (this.signupOtpInput.trim().length < 4) {
      this.signupOtpInput = this.signupOtpInput.trim();
      return;
    }
    this.otpVerifiedFlag = true;
    this.otpRequested = false;
    this.signupForm.get('password')?.enable({ emitEvent: false });
    this.signupForm.get('confirmPassword')?.enable({ emitEvent: false });
  }

  onForgotSubmit(): void {
    if (this.forgotForm.valid) {
      const { mobile } = this.forgotForm.value;
      this.forgotPasswordRequest.emit(this.forgotForm.value);
      this.prepareOtp('forgot', mobile);
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
    this.otpVerified.emit({ mobile: this.pendingMobile, context: this.otpContext });
    alert('OTP verified!');
    this.returnToLogin();
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
}
