import { Component } from '@angular/core';

@Component({
  selector: 'app-recieve',
  standalone: false,
  templateUrl: './recieve.component.html',
  styleUrl: './recieve.component.css'
})
export class RecieveComponent {

  receivingData = [
  {
    poNumber: '47243',
    description: 'KIT MAINTENANCE FOR GA55',
    orderedQty: 1,
    receivedQty: 1,
  },
  {
    poNumber: '47226',
    description: 'Hydraulic Hose',
    orderedQty: 2,
    receivedQty: 2,
  
  },
  {
    poNumber: '47230',
    description: 'Brake Pipe',
    orderedQty: 4,
    receivedQty: 4,
  
  }
];

showUploadPopup = false;

openUploadPopup() {

  this.showUploadPopup = true;

}

closeUploadPopup() {

  this.showUploadPopup = false;

}

saveDocuments() {

  // Save logic here

  this.showUploadPopup = false;

}

}
