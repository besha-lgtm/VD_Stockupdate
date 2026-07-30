import { Component } from '@angular/core';

@Component({
  selector: 'app-issue',
  standalone: false,
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css'
})
export class IssueComponent {

   issuingData = [
  {
    poNumber: '47243',
    description: 'KIT MAINTENANCE FOR GA55',
    orderedQty: 1,
    issuedQty: 1,
    unit: 'Set',
    receipt: '29374',
    status: 'OPEN'
  },
  {
    poNumber: '47226',
    description: 'Hydraulic Hose',
    orderedQty: 2,
    issuedQty: 2,
    unit: 'Pieces',
    receipt: '29377',
    status: 'OPEN'
  },
  {
    poNumber: '47230',
    description: 'Brake Pipe',
    orderedQty: 4,
    issuedQty: 4,
    unit: 'Pieces',
    receipt: '29380',
    status: 'OPEN'
  }
];

}
