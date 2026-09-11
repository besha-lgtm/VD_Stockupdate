import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as QRCode from 'qrcode';
import { PurchaseOrderService, PurchaseOrderDto } from '../../services/purchase-order.service';
import { QrService } from '../../services/qr.service';

interface POSummary {
  id: number;
  poId: number;
  poNumber: string;
  supplierName: string;
  poDate: string;
  deliveryDate?: string;
  status: string;
  itemCount: number;
}

interface POItem {
  id: number;
  poNumber: string;
  supplierName: string;
  description: string;
  boxNumber: string;
  serialNumber: string;
  quantity: number;
  uom?: string;
  poItemId: number | null;
  selected?: boolean;
  qrStatus?: 'Generated' | 'Pending';
}


interface RecentQRItem {
  boxNo: string;
  qrCode: string;
  generatedOn: string;
}

@Component({
  selector: 'app-po-qr',
  standalone: false,
  templateUrl: './po-qr.component.html',
  styleUrl: './po-qr.component.css'
})
export class POQRComponent implements OnInit {

  // ---- Filter fields ----
  searchTerm = '';
  selectedSupplier = 'All Suppliers';
  selectedStatus = 'Approved';
  fromDate = '';
  toDate = '';

  suppliersList = ['All Suppliers', 'Stell Gles limited', 'ABC Packaging', 'Green Boards Pvt Ltd', 'Super Pack Solutions'];
  statusOptions = ['Approved', 'Pending Approval', 'Partially Received', 'Completed', 'All Statuses'];

  // ---- Main table: POSummary list ----
  poList: POSummary[] = [];
  loading = false;
  syncing = false;
  loadError = '';
  lastSyncTime = '10 Sep 2026, 10:15 AM';

  // ---- Selected PO and Inline Line Items ----
  selectedPO: POSummary | null = null;
  selectedPOItems: POItem[] = [];

  // ---- Right Side QR Panel State ----
  selectedItem: POItem | null = null;
  boxReelNumber = '';
  expectedQtyPerBox = 0;
  itemLocation = 'Rack A-12';
  itemWeight: number | string = 25.5;
  qrDataUrl: string | null = null;
  qrCodeText: string | null = null;
  generating = false;
  generateError = '';
  showQrSuccessAlert = false;

  // ---- Recent QR Codes History & Pagination ----
  recentQrPage = 1;
  recentQrPageSize = 3;
  recentQrList: RecentQRItem[] = [];

  get totalRecentQrPages(): number {
    return Math.ceil(this.recentQrList.length / this.recentQrPageSize) || 1;
  }

  get paginatedRecentQrList(): RecentQRItem[] {
    const start = (this.recentQrPage - 1) * this.recentQrPageSize;
    return this.recentQrList.slice(start, start + this.recentQrPageSize);
  }

  get recentQrPageArray(): number[] {
    return Array.from({ length: this.totalRecentQrPages }, (_, i) => i + 1);
  }

  prevRecentQrPage(): void {
    if (this.recentQrPage > 1) {
      this.recentQrPage--;
    }
  }

  nextRecentQrPage(): void {
    if (this.recentQrPage < this.totalRecentQrPages) {
      this.recentQrPage++;
    }
  }

  setRecentQrPage(p: number): void {
    this.recentQrPage = p;
  }

  // ---- Legacy Modals (kept for backward compatibility) ----
  showLineItemsModal = false;
  showCreatePOModal = false;
  showQrModal = false;
  poForm: FormGroup;

  private fullPOs: PurchaseOrderDto[] = [];

  constructor(
    private fb: FormBuilder,
    private poService: PurchaseOrderService,
    private qrService: QrService
  ) {
    this.poForm = this.fb.group({
      poNumber: ['', Validators.required],
      supplierName: ['', Validators.required],
      description: ['', Validators.required],
      boxNumber: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadPOs();
  }

  // ---- Stats Getters ----
  get totalPOsCount(): number {
    return this.poList.length;
  }

  get approvedCount(): number {
    return this.poList.filter(p => p.status.toLowerCase() === 'approved').length;
  }

  get pendingCount(): number {
    return this.poList.filter(p => p.status.toLowerCase().includes('pending')).length;
  }

  get partiallyReceivedCount(): number {
    return this.poList.filter(p => p.status.toLowerCase().includes('partially')).length;
  }

  get completedCount(): number {
    return this.poList.filter(p => p.status.toLowerCase() === 'completed').length;
  }

  private toSummaries(pos: PurchaseOrderDto[]): POSummary[] {
    return pos.map((po, idx) => ({
      id: idx + 1,
      poId: po.poId,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      poDate: po.poDate || '',
      deliveryDate: po.expectedDeliveryDate || '',
      status: po.status || '',
      itemCount: po.items?.length || 0
    }));
  }

  loadPOs(): void {
    this.loading = true;
    this.loadError = '';
    this.poService.list().subscribe({
      next: (res) => {
        this.fullPOs = res.data || [];
        this.poList = this.toSummaries(this.fullPOs);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load purchase orders';
        this.loading = false;
        this.poList = [];
      }
    });
  }

  syncPOs(): void {
    this.syncing = true;
    this.loadError = '';
    this.poService.syncFromVisipack().subscribe({
      next: () => {
        this.syncing = false;
        this.lastSyncTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        this.loadPOs();
      },
      error: (err) => {
        this.syncing = false;
        this.loadError = err?.error?.message || 'Sync with VISIPAK failed';
      }
    });
  }

  // Filter Data Getter
  get filteredData(): POSummary[] {
    let list = this.poList;
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      list = list.filter(po =>
        po.poNumber.toLowerCase().includes(term) ||
        po.supplierName.toLowerCase().includes(term)
      );
    }

    if (this.selectedSupplier !== 'All Suppliers') {
      list = list.filter(po => po.supplierName === this.selectedSupplier);
    }

    if (this.selectedStatus !== 'All Statuses') {
      list = list.filter(po => po.status.toLowerCase() === this.selectedStatus.toLowerCase());
    }

    return list;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedSupplier = 'All Suppliers';
    this.selectedStatus = 'Approved';
    this.fromDate = '';
    this.toDate = '';
  }

  // ---- Line Items modal trigger ----
  openLineItems(po: POSummary): void {
    this.selectedPO = po;
    const full = this.fullPOs.find(p => p.poId === po.poId);

    const items: POItem[] = [];

    if (full && full.items && full.items.length > 0) {
      full.items.forEach((item, idx) => {
        items.push({
          id: idx + 1,
          poNumber: po.poNumber,
          supplierName: po.supplierName,
          description: item.itemName || '',
          boxNumber: item.itemCode || '',
          serialNumber: `${po.poNumber}-${item.itemCode || ''}`,
          quantity: item.orderedQty || 0,
          uom: item.uomCode || '',
          poItemId: item.poItemId,
          selected: idx === 0,
          qrStatus: 'Pending'
        });
      });
    }

    this.selectedPOItems = items;
    this.showLineItemsModal = true;
  }

  // ---- Open Generate QR Modal (triggered from inside Line Items modal) ----
  openQrModal(item: POItem): void {
    this.selectedPOItems.forEach(i => i.selected = false);
    item.selected = true;
    this.selectedItem = item;

    this.boxReelNumber = `${item.boxNumber}-001`;
    this.expectedQtyPerBox = item.quantity;
    this.itemLocation = 'Rack A-12';
    this.itemWeight = 25.5;
    this.recentQrPage = 1;
    this.qrDataUrl = null;
    this.qrCodeText = `WHQR-${item.poNumber}-001`;
    this.showQrSuccessAlert = false;
    this.generateError = '';
    this.showQrModal = true;
  }

  selectLineItemForQR(item: POItem): void {
    this.selectedPOItems.forEach(i => i.selected = false);
    item.selected = true;
    this.selectedItem = item;

    this.boxReelNumber = `${item.boxNumber}-001`;
    this.expectedQtyPerBox = item.quantity;
    this.itemLocation = 'Rack A-12';
    this.itemWeight = 25.5;
    this.qrDataUrl = null;
    this.qrCodeText = `WHQR-${item.poNumber}-001`;
    this.showQrSuccessAlert = false;
    this.generateError = '';
  }

  refreshBoxReelNumber(): void {
    if (!this.selectedItem) return;
    const randomNum = Math.floor(Math.random() * 900) + 100;
    this.boxReelNumber = `${this.selectedItem.boxNumber}-${randomNum}`;
    this.qrCodeText = `WHQR-${this.selectedItem.poNumber}-${randomNum}`;
    if (this.qrDataUrl) {
      this.generateQrPreview();
    }
  }

  async generateQrPreview(): Promise<void> {
    if (!this.selectedItem) return;
    const textToEncode = this.qrCodeText || `WHQR-${this.selectedItem.poNumber}-001`;
    try {
      this.qrDataUrl = await QRCode.toDataURL(textToEncode, { width: 280, margin: 2 });
    } catch (err) {
      console.error('QR preview generation failed', err);
    }
  }

  async generateQr(): Promise<void> {
    if (!this.selectedItem) return;
    this.generating = true;
    this.generateError = '';
    this.showQrSuccessAlert = false;

    // Update item qrStatus to Generated
    this.selectedItem.qrStatus = 'Generated';

    if (this.selectedItem.poItemId != null) {
      this.qrService.generate(this.selectedItem.poNumber, this.selectedItem.poItemId).subscribe({
        next: async (res) => {
          try {
            this.qrCodeText = res.data.qrCode || `WHQR-${this.selectedItem?.poNumber}-001`;
            this.qrDataUrl = await QRCode.toDataURL(this.qrCodeText, { width: 280, margin: 2 });
            this.showQrSuccessAlert = true;
            if (this.selectedItem) {
              this.selectedItem.qrStatus = 'Generated';
            }
            this.addRecentQrEntry(this.boxReelNumber, this.qrCodeText);
          } catch (err) {
            console.error('QR image render failed', err);
          } finally {
            this.generating = false;
          }
        },
        error: async (err) => {
          this.generateError = err?.error?.message || 'Failed to generate QR Code';
          this.generating = false;
        }
      });
    } else {
      this.generateError = 'Invalid PO Item ID';
      this.generating = false;
    }
  }


  private addRecentQrEntry(boxNo: string, qrCode: string): void {
    const timeStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    // Add to top of recent list
    this.recentQrList.unshift({
      boxNo: boxNo || 'REELSEP09-001',
      qrCode: qrCode || 'WHQR-SPO-2026-0001-001',
      generatedOn: timeStr
    });
    // Keep max 5 items
    if (this.recentQrList.length > 5) {
      this.recentQrList.pop();
    }
  }

  clearSelectedItem(): void {
    this.selectedItem = null;
    this.qrDataUrl = null;
    this.showQrSuccessAlert = false;
  }

  closeLineItemsModal(): void {
    this.showLineItemsModal = false;
  }

  openCreatePOModal(): void {
    this.showCreatePOModal = true;
    this.poForm.reset({ poNumber: '', supplierName: '', description: '', boxNumber: '', quantity: 1 });
  }

  closeCreatePOModal(): void {
    this.showCreatePOModal = false;
  }

  saveNewPO(): void {
    if (this.poForm.invalid) {
      this.poForm.markAllAsTouched();
      return;
    }
    this.closeCreatePOModal();
    alert('Manual PO creation is disabled — POs must come from VISIPAK via "Sync from VISIPAK".');
  }

  closeQrModal(): void {
    this.showQrModal = false;
  }


  downloadQr(): void {
    if (!this.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.selectedItem?.poNumber || 'PO'}_${this.boxReelNumber || 'QR'}.png`;
    link.click();
  }

  printQr(): void {
    if (!this.qrDataUrl || !this.selectedItem) return;
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
            body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:Arial, sans-serif; background:#f5f7fa; }
            .qr-container { text-align:center; padding:30px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:450px; }
            .qr-image { max-width:260px; height:auto; margin-bottom:15px; }
            .qr-code-text { font-family:monospace; font-weight:bold; font-size:16px; color:#1e293b; margin-bottom:20px; letter-spacing:0.5px; }
            .qr-details { font-size:13px; color:#374151; text-align:left; }
            .qr-details p { margin:6px 0; padding:4px 0; border-bottom:1px solid #f0f0f0; }
            .qr-details p:last-child { border-bottom:none; }
            .qr-details strong { color:#1f2937; display:inline-block; width:130px; }
            .title { font-size:18px; font-weight:700; color:#0284c7; margin-bottom:15px; }
            @media print { .no-print { display:none; } .qr-container { box-shadow:none; border:1px solid #e5e7eb; } }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="title">WMS PO QR Code</div>
            <img src="${this.qrDataUrl}" alt="QR Code" class="qr-image" />
            <div class="qr-code-text">${this.qrCodeText || 'WHQR-' + item.poNumber}</div>
            <div class="qr-details">
              <p><strong>PO Number:</strong> ${item.poNumber}</p>
              <p><strong>Supplier:</strong> ${item.supplierName}</p>
              <p><strong>Item Code:</strong> ${item.boxNumber}</p>
              <p><strong>Description:</strong> ${item.description}</p>
              <p><strong>Ordered Quantity:</strong> ${item.quantity.toLocaleString()} ${item.uom || ''}</p>
              <p><strong>Box / Reel No:</strong> ${this.boxReelNumber}</p>
            </div>
            <button onclick="window.print()" class="no-print" style="margin-top:20px; padding:10px 24px; background:#0284c7; color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">
              🖨️ Print Label
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

