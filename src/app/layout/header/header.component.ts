import { Component, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { HeaderService, HeaderConfig } from './header.service';
import { Observable } from 'rxjs';
import { LoginService } from '../../login/login.service';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  headerConfig$: Observable<HeaderConfig>;

  // Dropdown states
  isPlantMenuOpen = false;
  isWarehouseMenuOpen = false;
  isUserMenuOpen = false;

  // Plant/Warehouse: there's no plants/warehouses table in the current
  // schema (this system tracks departments, not physical sites), so these
  // lists stay config-driven rather than pulled from an API. What we *can*
  // make real is remembering the user's choice — it's persisted to
  // localStorage instead of silently resetting to "Plant 101" on every
  // page load.
  plants = [
    { name: 'Plant 101', location: 'Cherlapally Plant' },
    { name: 'Plant 102', location: 'Patancheru Plant' },
    { name: 'Plant 103', location: 'Nacharam Plant' }
  ];

  warehouses = ['Warehouse-01', 'Warehouse-02', 'Warehouse-03', 'Central Store'];

  selectedPlant = this.plants[0];
  selectedWarehouse = this.warehouses[0];

  // ---- User info — pulled from the logged-in session (see login.service.ts),
  // not hardcoded. roleName comes from the real `roles` table via the login
  // payload (see backend auth.service.js). ----
  userFullName = 'User';
  userRole = '';
  userInitial = 'U';

  // ---- Live system status, pulled from GET /api/dashboard/system-status ----
  erpConnected = false;
  lastSyncTime = 'Not synced yet';
  notificationCount = 0;

  constructor(
    private sidebarService: SidebarService,
    private headerService: HeaderService,
    private loginService: LoginService,
    private router: Router,
    private dashboardService: DashboardService
  ) {
    this.headerConfig$ = this.headerService.headerConfig$;
  }

  ngOnInit(): void {
    this.loadUser();
    this.loadPersistedSelection();
    this.loadSystemStatus();
  }

  private loadUser(): void {
    try {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        this.userFullName = user?.fullName || user?.username || 'User';
        this.userRole = user?.roleName || user?.roleCode || '';
        this.userInitial = this.userFullName.trim().charAt(0).toUpperCase() || 'U';
      }
    } catch {
      // keep defaults
    }
  }

  private loadPersistedSelection(): void {
    try {
      const savedPlant = localStorage.getItem('selectedPlant');
      if (savedPlant) {
        const parsed = JSON.parse(savedPlant);
        const match = this.plants.find(p => p.name === parsed.name);
        if (match) this.selectedPlant = match;
      }
      const savedWarehouse = localStorage.getItem('selectedWarehouse');
      if (savedWarehouse && this.warehouses.includes(savedWarehouse)) {
        this.selectedWarehouse = savedWarehouse;
      }
    } catch {
      // keep defaults
    }
  }

  private loadSystemStatus(): void {
    this.dashboardService.getSystemStatus().subscribe({
      next: (res) => {
        const data = res.data;
        this.erpConnected = !!data?.erpConnected;
        this.notificationCount = data?.notificationsCount ?? 0;
        this.lastSyncTime = data?.lastSyncAt ? this.formatSyncTime(data.lastSyncAt) : 'Not synced yet';
      },
      error: () => {
        // Leave defaults (Not synced yet / disconnected) — a failed status
        // call shouldn't crash the header, just under-report.
      }
    });
  }

  private formatSyncTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Not synced yet';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  togglePlantMenu(): void {
    this.isPlantMenuOpen = !this.isPlantMenuOpen;
    this.isWarehouseMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  selectPlant(plant: { name: string; location: string }): void {
    this.selectedPlant = plant;
    this.isPlantMenuOpen = false;
    localStorage.setItem('selectedPlant', JSON.stringify(plant));
  }

  toggleWarehouseMenu(): void {
    this.isWarehouseMenuOpen = !this.isWarehouseMenuOpen;
    this.isPlantMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  selectWarehouse(wh: string): void {
    this.selectedWarehouse = wh;
    this.isWarehouseMenuOpen = false;
    localStorage.setItem('selectedWarehouse', wh);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isPlantMenuOpen = false;
    this.isWarehouseMenuOpen = false;
  }

  logout(): void {
    this.loginService.logout();
    this.router.navigate(['/login']);
  }
}