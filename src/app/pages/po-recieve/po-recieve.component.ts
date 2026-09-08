import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PoStatusService } from '../../services/po-status.service';
import { ReceivingService } from '../../services/receiving.service';

interface POReceivingItem {
  sno: number;
  poNumber: string;
  description: string;
  lastUpdated: Date;
  totalStock: number;
}

@Component({
  selector: 'app-po-recieve',
  standalone: false,
  templateUrl: './po-recieve.component.html',
  styleUrl: './po-recieve.component.css'
})
export class PORecieveComponent implements OnInit, OnDestroy {

  receivingData: POReceivingItem[] = [];
  loading = false;
  loadError = '';

  currentDate: Date = new Date();

  private statusSub?: Subscription;

  constructor(
    private poStatusService: PoStatusService,
    private receivingService: ReceivingService
  ) {}

  ngOnInit(): void {
    this.loadReceivings();

    this.statusSub = this.poStatusService.getAcceptedPoNumbers().subscribe(acceptedPoNumbers => {
      console.log('Updated PO statuses:', acceptedPoNumbers);
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }

  loadReceivings(): void {
    this.loading = true;
    this.loadError = '';
    this.receivingService.list().subscribe({
      next: (res) => {
        let sno = 1;
        const rows: POReceivingItem[] = [];
        for (const r of res.data || []) {
          for (const item of r.items) {
            // Once QC has passed, acceptedQty is the real usable stock figure;
            // before that, receivedQty (what physically arrived) is the best we know.
            const qty = r.qcStatus === 'PASSED' ? item.acceptedQty : item.receivedQty;
            rows.push({
              sno: sno++,
              poNumber: r.poNumber,
              description: item.itemName,
              lastUpdated: r.approvedAt ? new Date(r.approvedAt) : this.currentDate,
              totalStock: qty
            });
          }
        }
        this.receivingData = rows;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load stock data';
        this.loading = false;
      }
    });
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  getTotalStock(): number {
    return this.receivingData.reduce((total, item) => total + item.totalStock, 0);
  }

  refreshCurrentDate(): void {
    this.currentDate = new Date();
    this.loadReceivings();
  }
}
