import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  
  constructor(private router: Router) {}
  
  // Data for the 4 large Action Cards
  mainCards = [
    { 
      id: 'po', 
      title: 'Purchase Orders', 
      desc: 'View POs, sync from ERP and generate QR labels', 
      colorClass: 'card-po' 
    },
    { 
      id: 'receive', 
      title: 'Receive Material', 
      desc: 'Scan QR and receive items', 
      colorClass: 'card-receive' 
    },
    { 
      id: 'issue', 
      title: 'Issue Material', 
      desc: 'Pick and issue to production or other locations', 
      colorClass: 'card-issue' 
    },
    { 
      id: 'approval', 
      title: 'Approval', 
      desc: 'Review, approve and send to ERP', 
      colorClass: 'card-approval' 
    }
  ];

  // Data for the 5 small Stat Cards
  stats = [
    { 
      title: 'POs Expected Today', 
      value: '12', 
      sub1: '8 Open', 
      sub2: '3 Partially Received', 
      colorClass: 'stat-blue' 
    },
    { 
      title: 'Received Today', 
      value: '8', 
      sub1: '24 Items', 
      sub2: '120 Rolls', 
      colorClass: 'stat-green' 
    },
    { 
      title: 'Awaiting QC', 
      value: '4', 
      sub1: '3 POs', 
      sub2: '28 Items', 
      colorClass: 'stat-orange' 
    },
    { 
      title: 'Pending Approval', 
      value: '3', 
      sub1: '1 PO', 
      sub2: '12 Items', 
      colorClass: 'stat-purple' 
    },
    { 
      title: 'Available Stock', 
      value: '326', 
      sub1: '156 Items', 
      sub2: '12 Locations', 
      colorClass: 'stat-blue-dark' 
    }
  ];

  // Steps for Warehouse Process Flow
  processSteps = [
    { id: 1, title: 'PO', desc: 'From ERP' },
    { id: 2, title: 'QR Label', desc: 'Generate & Print' },
    { id: 3, title: 'Receive', desc: 'Scan & Receive' },
    { id: 4, title: 'Verify', desc: 'Check & Upload Docs' },
    { id: 5, title: 'QC', desc: 'Quality Inspection' },
    { id: 6, title: 'Approval', desc: 'Approve to ERP' },
    { id: 7, title: 'Stock', desc: 'Available for Use' }
  ];

  // Quick Actions List
  quickActions = [
    { label: 'Sync with ERP', icon: 'pi pi-sync', route: '/poqr' },
    { label: 'Print QR Labels', icon: 'pi pi-print', route: '/poqr' },
    { label: 'Scan & Receive', icon: 'pi pi-qrcode', route: '/rscan' },
    { label: 'View Exceptions', icon: 'pi pi-exclamation-triangle', isDanger: true, route: '/poqr' }
  ];

  // Recent Transactions Table Data
  recentTransactions: any[] = [];

  // Attention Required List
  attentionRequired: any[] = [];

  onCardClick(id: string) {
    console.log('Action card clicked:', id);
    // Add routing logic here when needed
  }

  onQuickActionClick(route: string) {
    if (route) {
      this.router.navigate([route]);
    }
  }
}
