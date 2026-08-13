import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PoStatusService } from '../../services/po-status.service';

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

  receivingData: POReceivingItem[] = [
    {
      sno: 1,
      poNumber: '47243',
      description: 'KIT MAINTENANCE FOR GA55',
      lastUpdated: new Date('2024-01-15T10:30:00'),
      totalStock: 100
    },
    {
      sno: 2,
      poNumber: '47226',
      description: 'Hydraulic Hose',
      lastUpdated: new Date('2024-01-14T14:45:00'),
      totalStock: 50
    },
    {
      sno: 3,
      poNumber: '47230',
      description: 'Brake Pipe',
      lastUpdated: new Date('2024-01-13T09:15:00'),
      totalStock: 75
    },
    {
      sno: 4,
      poNumber: '47244',
      description: 'VALVE',
      lastUpdated: new Date('2024-01-12T16:20:00'),
      totalStock: 30
    },
    {
      sno: 5,
      poNumber: '47245',
      description: 'COOLER',
      lastUpdated: new Date('2024-01-11T11:00:00'),
      totalStock: 45
    }
  ];

  // Current date for display
  currentDate: Date = new Date();

  private statusSub?: Subscription;

  constructor(private poStatusService: PoStatusService) {}

  ngOnInit(): void {
    // Subscribe to status updates from the service
    this.statusSub = this.poStatusService.getAcceptedPoNumbers().subscribe(acceptedPoNumbers => {
      console.log('Updated PO statuses:', acceptedPoNumbers);
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }

  // Get formatted date
  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Calculate total stock
  getTotalStock(): number {
    return this.receivingData.reduce((total, item) => total + item.totalStock, 0);
  }

  // Refresh current date
  refreshCurrentDate(): void {
    this.currentDate = new Date();
  }
}