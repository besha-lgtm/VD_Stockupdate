import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardStat, RecentTransaction, AttentionItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  constructor(private router: Router, private dashboardService: DashboardService) {}

  // Greeting — pulled from the logged-in user (see login.service.ts), not hardcoded.
  userFullName = 'there';

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  // Data for the 4 large Action Cards (navigation only — no live data to bind here)
  // Routes point at the pages that are actually wired into the sidebar/app-routing:
  // there's no standalone /rscan or /approval destination in this build — scanning
  // and the approval decision both live inside the /recieve wizard (step 1 = scan,
  // step 4 = approve), so both cards point there.
  mainCards = [
    {
      id: 'po',
      title: 'Purchase Orders',
      desc: 'View POs, sync from ERP and generate QR labels',
      colorClass: 'card-po',
      route: '/poqr'
    },
    {
      id: 'receive',
      title: 'Receive Material',
      desc: 'Scan QR and receive items',
      colorClass: 'card-receive',
      route: '/recieve'
    },
    {
      id: 'issue',
      title: 'Issue Material',
      desc: 'Pick and issue to production or other locations',
      colorClass: 'card-issue',
      route: '/issue'
    },
    {
      id: 'approval',
      title: 'Approval',
      desc: 'Review, approve and send to ERP',
      colorClass: 'card-approval',
      route: '/recieve'
    }
  ];

  // ---- Live stats, pulled from GET /api/dashboard/summary ----
  stats: DashboardStat[] = [];
  statsLoading = false;
  statsError = '';

  // Steps for Warehouse Process Flow — a fixed reference diagram of the
  // workflow itself, not a data table, so this stays static by design.
  processSteps = [
    { id: 1, title: 'PO', desc: 'From ERP' },
    { id: 2, title: 'QR Label', desc: 'Generate & Print' },
    { id: 3, title: 'Receive', desc: 'Scan & Receive' },
    { id: 4, title: 'Verify', desc: 'Check & Upload Docs' },
    { id: 5, title: 'QC', desc: 'Quality Inspection' },
    { id: 6, title: 'Approval', desc: 'Approve to ERP' },
    { id: 7, title: 'Stock', desc: 'Available for Use' }
  ];

  // Quick Actions List — same reasoning as mainCards above: Scan & Receive and
  // View Exceptions both route into /recieve, since that's where receiving
  // exceptions (rejected / QC failed / push failed) actually get resolved.
  quickActions = [
    { label: 'Sync with ERP', icon: 'pi pi-sync', route: '/poqr' },
    { label: 'Print QR Labels', icon: 'pi pi-print', route: '/poqr' },
    { label: 'Scan & Receive', icon: 'pi pi-qrcode', route: '/recieve' },
    { label: 'View Exceptions', icon: 'pi pi-exclamation-triangle', isDanger: true, route: '/recieve' }
  ];

  // ---- Live data, pulled from GET /api/dashboard/summary ----
  recentTransactions: RecentTransaction[] = [];
  attentionRequired: AttentionItem[] = [];

  // ---- Recent Transactions pagination (client-side over the fetched batch) ----
  recentTxnPage = 1;
  recentTxnPageSize = 8;

  // ---- Attention Required pagination (client-side over the fetched batch) ----
  attentionPage = 1;
  attentionPageSize = 4;

  ngOnInit(): void {
    this.loadUser();
    this.loadDashboard();
  }


  private loadUser(): void {
    try {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        this.userFullName = user?.fullName || user?.username || 'there';
      }
    } catch {
      this.userFullName = 'there';
    }
  }

  loadDashboard(): void {
    this.statsLoading = true;
    this.statsError = '';
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        const data = res.data;
        this.stats = data?.stats || [];
        this.recentTransactions = data?.recentTransactions || [];
        this.attentionRequired = data?.attentionRequired || [];
        this.recentTxnPage = 1;
        this.attentionPage = 1;
        this.statsLoading = false;
      },
      error: (err) => {
        this.statsError = err?.error?.message || 'Failed to load dashboard data';
        this.statsLoading = false;
      }
    });
  }

  statIcon(title: string): string {
    switch (title) {
      case 'POs Expected Today': return 'pi pi-file';
      case 'Received Today': return 'pi pi-box';
      case 'Awaiting QC': return 'pi pi-clock';
      case 'Pending Approval': return 'pi pi-check-circle';
      case 'Available Stock': return 'pi pi-server';
      default: return 'pi pi-info-circle';
    }
  }

  statusClass(status: string): string {
    return (status || '').toLowerCase().replace(/\s+/g, '-');
  }

  // ---- Recent Transactions pagination ----
  get totalRecentTxnPages(): number {
    return Math.ceil(this.recentTransactions.length / this.recentTxnPageSize) || 1;
  }

  get paginatedRecentTransactions(): RecentTransaction[] {
    const start = (this.recentTxnPage - 1) * this.recentTxnPageSize;
    return this.recentTransactions.slice(start, start + this.recentTxnPageSize);
  }

  get recentTxnPageArray(): number[] {
    return Array.from({ length: this.totalRecentTxnPages }, (_, i) => i + 1);
  }

  get recentTxnRangeLabel(): string {
    if (this.recentTransactions.length === 0) return '0 - 0';
    const start = (this.recentTxnPage - 1) * this.recentTxnPageSize + 1;
    const end = Math.min(this.recentTxnPage * this.recentTxnPageSize, this.recentTransactions.length);
    return `${start} - ${end}`;
  }

  prevRecentTxnPage(): void {
    if (this.recentTxnPage > 1) this.recentTxnPage--;
  }

  nextRecentTxnPage(): void {
    if (this.recentTxnPage < this.totalRecentTxnPages) this.recentTxnPage++;
  }

  setRecentTxnPage(p: number): void {
    this.recentTxnPage = p;
  }

  // ---- Attention Required pagination ----
  get totalAttentionPages(): number {
    return Math.ceil(this.attentionRequired.length / this.attentionPageSize) || 1;
  }

  get paginatedAttentionRequired(): AttentionItem[] {
    const start = (this.attentionPage - 1) * this.attentionPageSize;
    return this.attentionRequired.slice(start, start + this.attentionPageSize);
  }

  get attentionPageArray(): number[] {
    return Array.from({ length: this.totalAttentionPages }, (_, i) => i + 1);
  }

  get attentionRangeLabel(): string {
    if (this.attentionRequired.length === 0) return '0 - 0';
    const start = (this.attentionPage - 1) * this.attentionPageSize + 1;
    const end = Math.min(this.attentionPage * this.attentionPageSize, this.attentionRequired.length);
    return `${start} - ${end}`;
  }

  prevAttentionPage(): void {
    if (this.attentionPage > 1) this.attentionPage--;
  }

  nextAttentionPage(): void {
    if (this.attentionPage < this.totalAttentionPages) this.attentionPage++;
  }

  setAttentionPage(p: number): void {
    this.attentionPage = p;
  }

  onCardClick(id: string): void {
    const card = this.mainCards.find(c => c.id === id);
    if (card?.route) {
      this.router.navigate([card.route]);
    }
  }

  onQuickActionClick(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }
}