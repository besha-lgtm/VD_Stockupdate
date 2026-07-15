import { Component } from '@angular/core';

@Component({
  selector: 'app-purchase-order-qr',
  standalone: false,
  templateUrl: './purchase-order-qr.component.html',
  styleUrls: ['./purchase-order-qr.component.css']
})
export class PurchaseOrderQrComponent {
  poNumber = '';
  showDetails = false;
  showQr = false;
  details: any = null;

  onSearch(): void {
    const trimmed = this.poNumber.trim();
    if (trimmed) {
      console.log('Searching PO number:', trimmed);
      // Mock PO details matching the user's PO1001 screenshot
      this.details = {
        poNumber: trimmed,
        item: trimmed.toUpperCase() === 'PO1001' ? 'Cement Bulk-OPC (Sale)' : 'Standard Steel Rods (Sale)',
        quantity: trimmed.toUpperCase() === 'PO1001' ? 10 : 45
      };
      this.showDetails = true;
      this.showQr = false; // Hide QR code until Generate is clicked
    }
  }

  onGenerateQr(): void {
    this.showQr = true;
  }
}
