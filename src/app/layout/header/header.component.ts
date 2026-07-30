import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  constructor(private router: Router) {}

  logout(): void {
    // Optional: Clear session/local storage
    localStorage.clear();
    sessionStorage.clear();

    // Navigate to login page
    this.router.navigate(['/login']);
  }

}
