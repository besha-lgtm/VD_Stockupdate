import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, HubSummary } from '../../services/dashboard.service';

@Component({
  selector: 'app-main-menu',
  standalone: false,
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent implements OnInit, OnDestroy {

  constructor(private router: Router, private dashboardService: DashboardService) {}

  // ---- User + plant — same source as the header, so this page stays
  // consistent with whatever's shown there (see header.component.ts) ----
  userFullName = 'there';
  plantLabel = 'Plant 101';

  // ---- Live system status (real ERP connection state, not a fake "Dock
  // Bay 04 Active" pill) ----
  erpConnected = false;

  // ---- Live clock — genuinely real-time, unlike the old hardcoded
  // "Shift 01 (06:00 - 14:00)" pill which never changed ----
  currentTime = '';
  private clockHandle: any;

  // ---- Hub card stats, pulled from GET /api/dashboard/hub-summary ----
  hub: HubSummary | null = null;
  hubLoading = false;

  ngOnInit(): void {
    this.loadUser();
    this.loadPlant();
    this.loadSystemStatus();
    this.loadHubSummary();
    this.updateClock();
    this.clockHandle = setInterval(() => this.updateClock(), 30000);
  }

  ngOnDestroy(): void {
    if (this.clockHandle) clearInterval(this.clockHandle);
  }

  private loadUser(): void {
    try {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        this.userFullName = user?.fullName || user?.username || 'there';
      }
    } catch {
      // keep default
    }
  }

  private loadPlant(): void {
    try {
      const saved = localStorage.getItem('selectedPlant');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) this.plantLabel = parsed.name;
      }
    } catch {
      // keep default
    }
  }

  private loadSystemStatus(): void {
    this.dashboardService.getSystemStatus().subscribe({
      next: (res) => { this.erpConnected = !!res.data?.erpConnected; },
      error: () => { this.erpConnected = false; }
    });
  }

  private loadHubSummary(): void {
    this.hubLoading = true;
    this.dashboardService.getHubSummary().subscribe({
      next: (res) => {
        this.hub = res.data;
        this.hubLoading = false;
      },
      error: () => {
        this.hubLoading = false;
      }
    });
  }

  private updateClock(): void {
    this.currentTime = new Date().toLocaleString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  // Routes point at the pages actually used in this build — /rscan and /iscan
  // are dead ends with nothing linking to them (see dashboard.component.ts
  // for the same fix); scanning lives inside /recieve, issue scanning lives
  // inside /issue, and approval has its own dedicated screen at /porecieve.
  onSelect(option: string): void {
    if (option === 'DASHBOARD') {
      this.router.navigate(['/dashboard']);
    } else if (option === 'PO') {
      this.router.navigate(['/poqr']);
    } else if (option === 'RECEIVE') {
      this.router.navigate(['/recieve']);
    } else if (option === 'ISSUE') {
      this.router.navigate(['/issue']);
    } else if (option === 'APPROVAL') {
      this.router.navigate(['/porecieve']);
    }
  }
}