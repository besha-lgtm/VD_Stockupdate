import { Component, Output, EventEmitter } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { HeaderService, HeaderConfig } from './header.service';
import { Observable } from 'rxjs';
import { LoginService } from '../../login/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {

  @Output() addNewClicked = new EventEmitter<void>();

  headerConfig$: Observable<HeaderConfig>;

  // Dropdown states
  isPlantMenuOpen = false;
  isWarehouseMenuOpen = false;
  isUserMenuOpen = false;

  // Selected values
  selectedPlant = { name: 'Plant 101', location: 'Cherlapally Plant' };
  selectedWarehouse = 'Warehouse-01';
  
  plants = [
    { name: 'Plant 101', location: 'Cherlapally Plant' },
    { name: 'Plant 102', location: 'Patancheru Plant' },
    { name: 'Plant 103', location: 'Nacharam Plant' }
  ];

  warehouses = ['Warehouse-01', 'Warehouse-02', 'Warehouse-03', 'Central Store'];

  notificationCount = 3;
  lastSyncTime = '10 Sep 2026, 10:15 AM';

  constructor(
    private sidebarService: SidebarService,
    private headerService: HeaderService,
    private loginService: LoginService,
    private router: Router
  ) {
    this.headerConfig$ = this.headerService.headerConfig$;
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
  }

  toggleWarehouseMenu(): void {
    this.isWarehouseMenuOpen = !this.isWarehouseMenuOpen;
    this.isPlantMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  selectWarehouse(wh: string): void {
    this.selectedWarehouse = wh;
    this.isWarehouseMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isPlantMenuOpen = false;
    this.isWarehouseMenuOpen = false;
  }

  onAddNew(): void {
    this.addNewClicked.emit();
  }

  logout(): void {
    this.loginService.logout();
    this.router.navigate(['/login']);
  }
}