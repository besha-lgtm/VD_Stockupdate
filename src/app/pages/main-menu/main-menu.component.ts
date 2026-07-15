import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-menu',
  standalone: false,
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent {
  constructor(private router: Router) {}

  onSelect(option: string): void {
    console.log(`Main Menu selection: ${option}`);
    if (option === 'PO') {
      this.router.navigate(['/po-qr']);
    }
  }
}
