import { Component } from '@angular/core';
import * as QRCode from 'qrcode';

interface IssueItem {
  id: number;
  requestNumber: string;
  department: string;
  item: string;
  required: number;
  status: string;
  qrDataUrl: string | null;
}

@Component({
  selector: 'app-issue',
  standalone: false,
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css'
})
export class IssueComponent {

  // ---- Show Issue Form ----
  showIssueForm = false;
  
  // ---- New Issue Form Data ----
  newIssue = {
    requestNumber: '',
    department: '',
    item: '',
    required: 1
  };

  // ---- Stock Check Message ----
  stockMessage: string | null = null;
  stockChecked = false;

  // ---- Issue Data ----
  issuingData: IssueItem[] = [
    {
      id: 1,
      requestNumber: 'REQ-001',
      department: 'Production',
      item: 'KIT MAINTENANCE FOR GA55',
      required: 1,
      status: 'ISSUED',
      qrDataUrl: null
    },
    {
      id: 2,
      requestNumber: 'REQ-002',
      department: 'Maintenance',
      item: 'Hydraulic Hose',
      required: 2,
      status: 'ISSUED',
      qrDataUrl: null
    },
    {
      id: 3,
      requestNumber: 'REQ-003',
      department: 'Quality',
      item: 'Brake Pipe',
      required: 4,
      status: 'ISSUED',
      qrDataUrl: null
    }
  ];

  // ---- QR Modal ----
  showQrModal = false;
  selectedItem: IssueItem | null = null;
  generating = false;

  constructor() {}

  // ---- Open Issue Form ----
  openIssueForm() {
    this.showIssueForm = true;
    this.newIssue = {
      requestNumber: '',
      department: '',
      item: '',
      required: 1
    };
    this.stockMessage = null;
    this.stockChecked = false;
  }

  // ---- Close Issue Form ----
  closeIssueForm() {
    this.showIssueForm = false;
    this.stockMessage = null;
    this.stockChecked = false;
  }

  // ---- Check Stock ----
  checkStock() {
    if (!this.newIssue.requestNumber || !this.newIssue.department || 
        !this.newIssue.item || this.newIssue.required < 1) {
      alert('Please fill all fields before checking stock');
      return;
    }

    // Simulate stock check - In real app, this would check against actual stock
    this.stockChecked = true;
    this.stockMessage = `Yes, we have stock available! ${this.newIssue.required} units of "${this.newIssue.item}" are available for ${this.newIssue.department}.`;
  }

  // ---- Save Issue (after stock check) ----
  saveIssue() {
    if (!this.stockChecked) {
      alert('Please check stock availability first');
      return;
    }

    if (!this.newIssue.requestNumber || !this.newIssue.department || 
        !this.newIssue.item || this.newIssue.required < 1) {
      alert('Please fill all fields correctly');
      return;
    }

    const newItem: IssueItem = {
      id: this.issuingData.length + 1,
      requestNumber: this.newIssue.requestNumber,
      department: this.newIssue.department,
      item: this.newIssue.item,
      required: this.newIssue.required,
      status: 'ISSUED',
      qrDataUrl: null
    };

    // Add new item at the beginning
    this.issuingData.unshift(newItem);
    
    // Show success message
    alert(`✅ Items have been issued successfully!\n\nRequest: ${newItem.requestNumber}\nDepartment: ${newItem.department}\nItem: ${newItem.item}\nQuantity: ${newItem.required}`);
    
    this.closeIssueForm();
  }

  // ---- Generate QR for Issue ----
  openQrModal(item: IssueItem) {
    this.selectedItem = item;
    this.qrDataUrl = null;
    this.generating = false;
    this.showQrModal = true;
    
    // Auto-generate QR when modal opens
    this.generateQr();
  }

  closeQrModal() {
    this.showQrModal = false;
    this.selectedItem = null;
    this.qrDataUrl = null;
    this.generating = false;
  }

  qrDataUrl: string | null = null;

  async generateQr() {
    if (!this.selectedItem) return;
    
    this.generating = true;

    try {
      const payload = {
        requestNumber: this.selectedItem.requestNumber,
        department: this.selectedItem.department,
        item: this.selectedItem.item,
        required: this.selectedItem.required,
        status: this.selectedItem.status
      };

      this.qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 300,
        margin: 2
      });
      
      // Store QR in the item
      this.selectedItem.qrDataUrl = this.qrDataUrl;
      
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
    link.download = `${this.selectedItem?.requestNumber}_${this.selectedItem?.item}.png`;
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
          <title>QR Code - ${item.requestNumber}</title>
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
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              background: #d1fae5;
              color: #065f46;
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
            <div class="title">Issue QR Code</div>
            <img src="${this.qrDataUrl}" alt="QR Code" class="qr-image" />
            <div class="qr-details">
              <p><strong>Request Number:</strong> ${item.requestNumber}</p>
              <p><strong>Department:</strong> ${item.department}</p>
              <p><strong>Item:</strong> ${item.item}</p>
              <p><strong>Required Quantity:</strong> ${item.required}</p>
              <p><strong>Status:</strong> <span class="status-badge">${item.status}</span></p>
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

  // ---- Get Total Issued ----
  getTotalIssued(): number {
    return this.issuingData.reduce((total, item) => total + item.required, 0);
  }
}