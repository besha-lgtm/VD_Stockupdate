import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from './login.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm: FormGroup;
  loading = false;
  errorMsg = '';
  successMsg = '';

  // View control
  currentView: string = 'login'; // 'login' | 'forgot-password' | 'verify-otp' | 'reset-password' | 'reset-success'
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // Form bindings for template-driven sections
  forgotEmail = '';
  otpCode = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  goBack(): void {
    this.router.navigate(['/main-menu']);
  }

  switchView(view: string): void {
    this.currentView = view;
    this.errorMsg = '';
    this.successMsg = '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const { email, password } = this.loginForm.value;

    // Simulate network delay for a better user experience
    setTimeout(() => {
      if (email === 'admin@gmail.com' && password === 'admin@123') {
        console.log('Static login success');
        sessionStorage.setItem('token', 'mock-session-token');
        this.loading = false;
        this.router.navigate(['/dashboard']);
      } else {
        this.loading = false;
        this.errorMsg = 'Invalid email or password';
      }
    }, 800);
  }

  sendOtp(): void {
    if (!this.forgotEmail) {
      this.errorMsg = 'Email address is required';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    setTimeout(() => {
      this.loading = false;
      this.successMsg = 'Demo OTP is: 123456';
      this.switchView('verify-otp');
    }, 1000);
  }

  verifyOtp(): void {
    if (!this.otpCode) {
      this.errorMsg = 'Please enter the 6-digit OTP code';
      return;
    }
    if (this.otpCode === '123456') {
      this.switchView('reset-password');
    } else {
      this.errorMsg = 'Invalid OTP code. Try "123456" for demo purposes.';
    }
  }

  resetPassword(): void {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMsg = 'Please fill in all password fields';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    setTimeout(() => {
      this.loading = false;
      this.switchView('reset-success');
    }, 1000);
  }
}