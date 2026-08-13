import { Component } from '@angular/core';
import * as QRCode from 'qrcode';

interface POItem {
  id: number;
  poNumber: string;
  supplierName: string;
  description: string;
  boxNumber: string;
  serialNumber: string;
  quantity: number;
}

@Component({
  selector: 'app-po-qr',
  standalone: false,
  templateUrl: './po-qr.component.html',
  styleUrl: './po-qr.component.css'
})
export class POQRComponent {

  // ---- search field ----
  searchTerm = '';

  // ---- master + filtered data ----
  qrData: POItem[] = [
    {
      id: 1,
      poNumber: '47243',
      supplierName: 'ABC Supplies',
      description: 'KIT MAINTENANCE',
      boxNumber: 'BOX-001',
      serialNumber: 'SN001',
      quantity: 100
    },
    {
      id: 2,
      poNumber: '47244',
      supplierName: 'ABC Supplies',
      description: 'VALVE',
      boxNumber: 'BOX-002',
      serialNumber: 'SN002',
      quantity: 50
    },
    {
      id: 3,
      poNumber: '47245',
      supplierName: 'XYZ Traders',
      description: 'COOLER',
      boxNumber: 'BOX-003',
      serialNumber: 'SN003',
      quantity: 75
    },
    {
      id: 4,
      poNumber: '47246',
      supplierName: 'XYZ Traders',
      description: 'MAINTENANCE KIT',
      boxNumber: 'BOX-004',
      serialNumber: 'SN004',
      quantity: 30
    }
  ];

  // ---- Create PO Modal state ----
  showCreatePOModal = false;
  newPO = {
    poNumber: '',
    supplierName: '',
    description: '',
    boxNumber: '',
    quantity: 1
  };

  // ---- QR modal state ----
  showQrModal = false;
  selectedItem: POItem | null = null;
  qrDataUrl: string | null = null;
  generating = false;

  // ---- Counter for serial number ----
  private serialCounter = 5;

  // ---- search ----
  get filteredData(): POItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.qrData;
    }

    return this.qrData.filter(item =>
      item.poNumber.toLowerCase().includes(term) ||
      item.supplierName.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.boxNumber.toLowerCase().includes(term)
    );
  }

  // ---- Create PO Modal ----
  openCreatePOModal() {
    this.showCreatePOModal = true;
    this.newPO = {
      poNumber: '',
      supplierName: '',
      description: '',
      boxNumber: '',
      quantity: 1
    };
  }

  closeCreatePOModal() {
    this.showCreatePOModal = false;
  }

  saveNewPO() {
    if (!this.newPO.poNumber || !this.newPO.supplierName || !this.newPO.description || 
        !this.newPO.boxNumber || this.newPO.quantity < 1) {
      alert('Please fill all fields correctly');
      return;
    }

    const newItem: POItem = {
      id: this.qrData.length + 1,
      poNumber: this.newPO.poNumber,
      supplierName: this.newPO.supplierName,
      description: this.newPO.description,
      boxNumber: this.newPO.boxNumber,
      serialNumber: `SN${String(this.serialCounter).padStart(3, '0')}`,
      quantity: this.newPO.quantity
    };

    this.serialCounter++;
    // Add new item at the beginning of the array (top)
    this.qrData.unshift(newItem);
    this.closeCreatePOModal();
    alert('PO created successfully!');
  }

  // ---- QR modal ----
  openQrModal(item: POItem) {
    this.selectedItem = item;
    this.qrDataUrl = null;
    this.generating = false;
    this.showQrModal = true;
  }

  closeQrModal() {
    this.showQrModal = false;
    this.selectedItem = null;
    this.qrDataUrl = null;
    this.generating = false;
  }

  async generateQr() {
    if (!this.selectedItem) return;
    
    this.generating = true;

    try {
      const payload = {
        poNumber: this.selectedItem.poNumber,
        supplierName: this.selectedItem.supplierName,
        description: this.selectedItem.description,
        boxNumber: this.selectedItem.boxNumber,
        serialNumber: this.selectedItem.serialNumber,
        expectedQuantity: this.selectedItem.quantity
      };

      this.qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 300,
        margin: 2
      });
    } catch (err) {
      console.error('QR generation failed', err);
      alert('Failed to generate QR code');
    } finally {
      this.generating = false;
    }
  }

  downloadQr() {
    if (!this.qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.selectedItem?.poNumber}_${this.selectedItem?.serialNumber}.png`;
    link.click();
  }

  printQr() {
    if (!this.qrDataUrl || !this.selectedItem) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      alert('Please allow popups for this site');
      return;
    }

    const item = this.selectedItem;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${item.poNumber}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f5f7fa;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            .qr-image {
              max-width: 300px;
              height: auto;
              margin-bottom: 20px;
            }
            .qr-details {
              margin-top: 20px;
              font-size: 14px;
              color: #374151;
              text-align: left;
              padding: 0 20px;
            }
            .qr-details p {
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .qr-details p:last-child {
              border-bottom: none;
            }
            .qr-details strong {
              color: #1f2937;
              display: inline-block;
              width: 140px;
            }
            .title {
              font-size: 20px;
              font-weight: 600;
              color: #0f766e;
              margin-bottom: 20px;
            }
            @media print {
              .no-print {
                display: none;
              }
              .qr-container {
                box-shadow: none;
                border: 1px solid #e5e7eb;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="title">PO QR Code</div>
            <img src="${this.qrDataUrl}" alt="QR Code" class="qr-image" />
            <div class="qr-details">
              <p><strong>PO Number:</strong> ${item.poNumber}</p>
              <p><strong>Supplier:</strong> ${item.supplierName}</p>
              <p><strong>Description:</strong> ${item.description}</p>
              <p><strong>Box Number:</strong> ${item.boxNumber}</p>
              <p><strong>Serial Number:</strong> ${item.serialNumber}</p>
              <p><strong>Expected Quantity:</strong> ${item.quantity}</p>
            </div>
            <button onclick="window.print()" class="no-print" style="margin-top: 25px; padding: 12px 30px; background: #0f766e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
              🖨️ Print QR Code
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}