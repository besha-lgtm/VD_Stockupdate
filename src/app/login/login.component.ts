import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const { username, password } = this.loginForm.value;

    // Simulate network delay for a better user experience
    setTimeout(() => {
      if (username === 'admin@gmail.com' && password === 'admin@123') {
        console.log('Static login success');
        sessionStorage.setItem('token', 'mock-session-token');
        this.loading = false;
        this.router.navigate(['/dashboard']);
      } else {
        this.loading = false;
        this.errorMsg = 'Invalid username or password';
      }
    }, 800);
  }
}