import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  stats = [
    { label: 'Active Purchase Orders', value: '12', icon: 'pi pi-file-o', color: '#0284c7' },
    { label: 'Pending Verification', value: '4', icon: 'pi pi-clock', color: '#f59e0b' },
    { label: 'Total Received Items', value: '382', icon: 'pi pi-check-circle', color: '#10b981' },
    { label: 'Total Issued Items', value: '145', icon: 'pi pi-box', color: '#ef4444' }
  ];
}
