import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { MainMenuComponent } from './pages/main-menu/main-menu.component';
import { PurchaseOrderQrComponent } from './pages/purchase-order-qr/purchase-order-qr.component';

const routes: Routes = [
  // ✅ Redirect FIRST
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // ✅ Login (public)
  { path: 'login', component: LoginComponent },

  // ✅ Main Menu (standalone)
  { path: 'main-menu', component: MainMenuComponent },

  // ✅ PO QR Generator (standalone)
  { path: 'po-qr', component: PurchaseOrderQrComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}