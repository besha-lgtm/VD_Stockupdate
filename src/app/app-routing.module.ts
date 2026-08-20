import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { MainMenuComponent } from './pages/main-menu/main-menu.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { POQRComponent } from './pages/po-qr/po-qr.component';
import { PORecieveComponent } from './pages/po-recieve/po-recieve.component';
import { IssueComponent } from './pages/issue/issue.component';
import { RecieveComponent } from './pages/recieve/recieve.component';
import { PurchaseOrderQrComponent } from './pages/purchase-order-qr/purchase-order-qr.component';
import { IscanComponent } from "./pages/iscan/iscan.component";
import { RscanComponent } from "./pages/rscan/rscan.component";

const routes: Routes = [
  // ✅ Redirect FIRST
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // ✅ Login (public)
  { path: 'login', component: LoginComponent },

  // ✅ Main Menu (standalone)
  { path: 'main-menu', component: MainMenuComponent },

  {path: 'dashboard', component: DashboardComponent},

  {path: 'header', component: HeaderComponent},

  {path:'poqr',component:POQRComponent},
   {path:'porecieve',component:PORecieveComponent},
    {path:'issue',component:IssueComponent},
     {path:'recieve',component:RecieveComponent},
     {path:'iscan',component:IscanComponent},
     {path:'rscan',component:RscanComponent},


   {path: 'sidebar', component: SidebarComponent},


  // ✅ PO QR Generator (standalone)
  { path: 'po-qr', component: PurchaseOrderQrComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}