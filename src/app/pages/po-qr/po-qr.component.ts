import { Component } from '@angular/core';

@Component({
  selector: 'app-po-qr',
  standalone: false,
  templateUrl: './po-qr.component.html',
  styleUrl: './po-qr.component.css'
})
export class POQRComponent {

  poNumber = '';

searchPO() {

  console.log('Searching PO :', this.poNumber);

}

qrData = [

  {
    poNumber: '47243',
    description: 'KIT MAINTENANCE',
    serialNumber: 'SN001',
    quantity: 1
  },

  {
    poNumber: '47243',
    description: 'VALVE',
    serialNumber: 'SN002',
    quantity: 2
  },

  {
    poNumber: '47243',
    description: 'COOLER',
    serialNumber: 'SN003',
    quantity: 1
  },

  {
    poNumber: '47243',
    description: 'MAINTENANCE KIT',
    serialNumber: 'SN004',
    quantity: 3
  }

];

}
