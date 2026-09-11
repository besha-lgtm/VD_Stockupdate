import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as QRCode from 'qrcode';
import { PurchaseOrderService, PurchaseOrderDto } from '../../services/purchase-order.service';
import { QrService } from '../../services/qr.service';

// One row per PO in the main table (what your lead wants — supplier-level, not line-item-level)
interface POSummary {
  id: number;
  poId: number;
  poNumber: string;
  supplierName: string;
  poDate: string;
  status: string;
  itemCount: number;
}

// One row per line item, shown inside the "Line Items" popup for a selected PO
interface POItem {
  id: number;
  poNumber: string;
  supplierName: string;
  description: string;
  boxNumber: string;
  serialNumber: string;
  quantity: number;
  poItemId: number | null;
}

@Component({
  selector: 'app-po-qr',
  standalone: false,
  templateUrl: './po-qr.component.html',
  styleUrl: './po-qr.component.css'
})
export class POQRComponent implements OnInit {

  // ---- search field ----
  searchTerm = '';

  // ---- main table: one row per Supplier PO ----
  poList: POSummary[] = [];
  loading = false;
  syncing = false;
  loadError = '';

  // ---- Line Items popup (new — sits between the main table and Generate QR) ----
  showLineItemsModal = false;
  selectedPO: POSummary | null = null;
  selectedPOItems: POItem[] = [];

  // ---- Create PO modal kept for legacy/manual testing only. POs are meant
  // to come from VISIPACK via "Sync from VISIPACK" above, not typed in here. ----
  showCreatePOModal = false;
  poForm: FormGroup;

  // ---- QR modal state (unchanged — now opened from the Line Items popup) ----
  showQrModal = false;
  selectedItem: POItem | null = null;
  qrDataUrl: string | null = null;
  generating = false;
  generateError = '';

  // Keep the full PurchaseOrderDto list around so the Line Items popup can
  // pull a PO's items without a second API call.
  private fullPOs: PurchaseOrderDto[] = [];

  constructor(
    private fb: FormBuilder,
    private poService: PurchaseOrderService,
    private qrService: QrService,
    private router: Router
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

  private toSummaries(pos: PurchaseOrderDto[]): POSummary[] {
    return pos.map((po, idx) => ({
      id: idx + 1,
      poId: po.poId,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      poDate: po.poDate,
      status: po.status,
      itemCount: po.items.length
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
      }
    });
  }

  // Step 1-3: pull the latest Approved Supplier POs from VISIPACK, then reload.
  syncPOs(): void {
    this.syncing = true;
    this.loadError = '';
    this.poService.syncFromVisipack().subscribe({
      next: () => {
        this.syncing = false;
        this.loadPOs();
      },
      error: (err) => {
        this.syncing = false;
        this.loadError = err?.error?.message || 'Sync with VISIPACK failed';
      }
    });
  }

  // ---- search (PO number or supplier name — this table is PO-level now) ----
  get filteredData(): POSummary[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.poList;
    return this.poList.filter(po =>
      po.poNumber.toLowerCase().includes(term) ||
      po.supplierName.toLowerCase().includes(term)
    );
  }

  // ---- Line Items popup ----
  // Your lead's ask: clicking a PO shows its line items first; QR is
  // generated per line item from inside that list, not straight from the PO row.
  openLineItems(po: POSummary): void {
    this.selectedPO = po;
    const full = this.fullPOs.find(p => p.poId === po.poId);
    this.selectedPOItems = (full?.items || []).map((item, idx) => ({
      id: idx + 1,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      description: item.itemName,
      boxNumber: item.itemCode,
      serialNumber: `${po.poNumber}-${item.itemCode}`,
      quantity: item.orderedQty,
      poItemId: item.poItemId
    }));
    this.showLineItemsModal = true;
  }

  closeLineItemsModal(): void {
    this.showLineItemsModal = false;
    this.selectedPO = null;
    this.selectedPOItems = [];
  }

  // ---- Create PO Modal (legacy, local-only, not persisted to WMS) ----
  openCreatePOModal() {
    this.showCreatePOModal = true;
    this.poForm.reset({ poNumber: '', supplierName: '', description: '', boxNumber: '', quantity: 1 });
  }

  closeCreatePOModal() {
    this.showCreatePOModal = false;
  }

  saveNewPO() {
    if (this.poForm.invalid) {
      this.poForm.markAllAsTouched();
      return;
    }
    this.closeCreatePOModal();
    alert('Manual PO creation is disabled here — new POs must come from VISIPACK via "Sync from VISIPACK".');
  }

  // ---- QR modal — now opened from inside the Line Items popup, one item at a time ----
  openQrModal(item: POItem) {
    this.selectedItem = item;
    this.qrDataUrl = null;
    this.generating = false;
    this.generateError = '';
    this.showQrModal = true;
  }

  closeQrModal() {
    this.showQrModal = false;
    this.selectedItem = null;
    this.qrDataUrl = null;
    this.generating = false;
  }

  // "Generate QR" — calls the real WMS API (POST /qr-transactions), tied to
  // this specific line item (poItemId), not just the PO as a whole.
  async generateQr() {
    if (!this.selectedItem) return;
    if (this.selectedItem.poItemId == null) {
      this.generateError = 'This line item has no linked poItemId (legacy/manual row) — cannot generate a real QR for it.';
      return;
    }
    this.generating = true;
    this.generateError = '';

    this.qrService.generate(this.selectedItem.poNumber, this.selectedItem.poItemId).subscribe({
      next: async (res) => {
        try {
          this.qrDataUrl = await QRCode.toDataURL(res.data.qrCode, { width: 300, margin: 2 });
        } catch (err) {
          console.error('QR image render failed', err);
        } finally {
          this.generating = false;
        }
      },
      error: (err) => {
        this.generateError = err?.error?.message || 'Failed to generate QR code';
        this.generating = false;
      }
    });
  }

  downloadQr() {
    if (!this.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.selectedItem?.poNumber}_${this.selectedItem?.serialNumber}.png`;
    link.click();
  }

  // "Go to Main Menu" — after generating (and optionally printing/downloading)
  // the QR, take the user back to the main menu instead of leaving them stuck
  // in this modal with no way out except the small "Close" (which had no
  // navigation wired to it at all).
  goToMainMenu(): void {
    this.closeQrModal();
    this.router.navigate(['/main-menu']);
  }

  printQr() {
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
            .qr-container { text-align:center; padding:40px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:500px; }
            .qr-image { max-width:300px; height:auto; margin-bottom:20px; }
            .qr-details { margin-top:20px; font-size:14px; color:#374151; text-align:left; padding:0 20px; }
            .qr-details p { margin:8px 0; padding:5px 0; border-bottom:1px solid #f0f0f0; }
            .qr-details p:last-child { border-bottom:none; }
            .qr-details strong { color:#1f2937; display:inline-block; width:140px; }
            .title { font-size:20px; font-weight:600; color:#0f766e; margin-bottom:20px; }
            @media print { .no-print { display:none; } .qr-container { box-shadow:none; border:1px solid #e5e7eb; } }
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
              <p><strong>Item Code:</strong> ${item.boxNumber}</p>
              <p><strong>Ordered Qty:</strong> ${item.quantity}</p>
            </div>
            <button onclick="window.print()" class="no-print" style="margin-top:25px; padding:12px 30px; background:#0f766e; color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
              🖨️ Print QR Code
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
