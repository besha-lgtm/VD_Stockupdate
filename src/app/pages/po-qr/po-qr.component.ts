import { Component } from '@angular/core';
import * as QRCode from 'qrcode';

interface POItem {
  poNumber: string;
  description: string;
  serialNumber: string;
  quantity: number;
}

interface QRUnit {
  unitIndex: number;
  poNumber: string;
  description: string;
  serialNumber: string;
  quantity: number;
  qrDataUrl: string | null;
  generating: boolean;
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

  // ---- QR modal state ----
  showQrModal = false;
  selectedItem: POItem | null = null;
  qrUnits: QRUnit[] = [];

  // ---- search ----
  // Computed automatically every change-detection cycle, so it always
  // reflects the latest searchTerm without needing a manual event handler.
  get filteredData(): POItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.qrData;
    }

    return this.qrData.filter(item =>
      item.poNumber.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }

  // ---- QR modal ----
  openQrModal(item: POItem) {
    this.selectedItem = item;

    this.qrUnits = Array.from({ length: item.quantity }, (_, i) => ({
      unitIndex: i + 1,
      poNumber: item.poNumber,
      description: item.description,
      serialNumber: item.serialNumber,
      quantity: item.quantity,
      qrDataUrl: null,
      generating: false
    }));

    this.showQrModal = true;
  }

  closeQrModal() {
    this.showQrModal = false;
    this.selectedItem = null;
    this.qrUnits = [];
  }

  async generateSingleQr(unit: QRUnit) {
    unit.generating = true;

    try {
      const payload = {
        poNumber: unit.poNumber,
        description: unit.description,
        serialNumber: unit.serialNumber,
        unit: `${unit.unitIndex}/${unit.quantity}`
      };

      unit.qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 180,
        margin: 1
      });
    } catch (err) {
      console.error('QR generation failed for unit', unit.unitIndex, err);
    } finally {
      unit.generating = false;
    }
  }

  async generateAllQr() {
    for (const unit of this.qrUnits) {
      if (!unit.qrDataUrl) {
        await this.generateSingleQr(unit);
      }
    }
  }

  downloadQr(unit: QRUnit) {
    if (!unit.qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = unit.qrDataUrl;
    link.download = `${unit.poNumber}_${unit.serialNumber}_${unit.unitIndex}.png`;
    link.click();
  }
}