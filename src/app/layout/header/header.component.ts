import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  // If the logo image fails to load (missing file, wrong path/case, etc.)
  // fall back to showing initials instead of a broken image icon.
  logoLoadFailed = false;

  constructor(private router: Router) {}

  onLogoError(): void {
    this.logoLoadFailed = true;
  }

  logout(): void {
    // Optional: Clear session/local storage
    localStorage.clear();
    sessionStorage.clear();

    // Navigate to login page
    this.router.navigate(['/login']);
  }

}