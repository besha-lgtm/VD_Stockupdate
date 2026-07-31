import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PoStatusService } from '../../services/po-status.service';

interface POReceivingItem {
  poNumber: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  receipt: string;
  status: string;
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
      poNumber: '47243',
      description: 'KIT MAINTENANCE FOR GA55',
      orderedQty: 1,
      receivedQty: 1,
      unit: 'Set',
      receipt: '29374',
      status: 'OPEN'
    },
    {
      poNumber: '47226',
      description: 'Hydraulic Hose',
      orderedQty: 2,
      receivedQty: 2,
      unit: 'Pieces',
      receipt: '29377',
      status: 'OPEN'
    },
    {
      poNumber: '47230',
      description: 'Brake Pipe',
      orderedQty: 4,
      receivedQty: 4,
      unit: 'Pieces',
      receipt: '29380',
      status: 'OPEN'
    }
  ];

  private statusSub?: Subscription;

  constructor(private poStatusService: PoStatusService) {}

  ngOnInit(): void {
    this.statusSub = this.poStatusService.getAcceptedPoNumbers().subscribe(acceptedPoNumbers => {
      this.receivingData.forEach(item => {
        if (acceptedPoNumbers.has(item.poNumber)) {
          item.status = 'RECEIVED';
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }
}