import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  location?: string | null;
  itemName?: string | null;
  receivedQtyPerBox?: string | null;
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

  // Built from whatever POs actually came back from WMS — never a fixed
  // guess list, since suppliers/statuses are only ever known once synced.
  get suppliersList(): string[] {
    const names = Array.from(new Set(this.poList.map(p => p.supplierName).filter(Boolean)));
    return ['All Suppliers', ...names.sort()];
  }

  get statusOptions(): string[] {
    const statuses = Array.from(new Set(this.poList.map(p => p.status).filter(Boolean)));
    return [...statuses.sort(), 'All Statuses'];
  }

  // ---- Main table: POSummary list ----
  poList: POSummary[] = [];
  loading = false;
  syncing = false;
  loadError = '';
  // null until a real sync has actually happened this session — no fabricated timestamp.
  lastSyncTime: string | null = null;

  // ---- PO table pagination — was static "1 2 3" buttons that did nothing ----
  poPage = 1;
  poPageSize = 10;

  // ---- Selected PO and Inline Line Items ----
  selectedPO: POSummary | null = null;
  selectedPOItems: POItem[] = [];

  // ---- Right Side QR Panel State ----
  selectedItem: POItem | null = null;
  boxReelNumber = '';
  expectedQtyPerBox = 0;
  // Free-text — staff jot down what actually arrived per box while
  // labelling, ahead of the formal Receive & Approve step. Persisted
  // alongside location (qr_transactions.attribute_3), purely informational.
  receivedQtyPerBox: string | null = null;
  // Optional warehouse storage location — persisted server-side (attribute_2),
  // not just a cosmetic field.
  location = '';
  qrDataUrl: string | null = null;
  qrCodeText: string | null = null;
  generating = false;
  generateError = '';
  showQrSuccessAlert = false;

  // ---- Recent QR Codes History & Pagination ----
  recentQrPage = 1;
  recentQrPageSize = 3;
  recentQrList: RecentQRItem[] = [];
  recentQrLoading = false;

  // Line Items modal pagination — a PO can carry many line items, and this
  // table had no paging at all before.
  lineItemsPage = 1;
  lineItemsPageSize = 5;

  get totalLineItemsPages(): number {
    return Math.ceil(this.selectedPOItems.length / this.lineItemsPageSize) || 1;
  }

  get paginatedLineItems(): POItem[] {
    const start = (this.lineItemsPage - 1) * this.lineItemsPageSize;
    return this.selectedPOItems.slice(start, start + this.lineItemsPageSize);
  }

  get lineItemsPageArray(): number[] {
    return Array.from({ length: this.totalLineItemsPages }, (_, i) => i + 1);
  }

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
        this.poPage = 1;
        this.loading = false;
        // Real statuses come back as DB enums (e.g. 'APPROVED'), but the
        // filter defaulted to the display-cased 'Approved' — a plain
        // <select>/[(ngModel)] pair only shows a selection when the bound
        // value exactly matches an <option>'s value, so that mismatch made
        // the Status field render blank. Resolve it case-insensitively
        // against whatever's actually in the data instead.
        this.resolveSelectedStatus();
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load purchase orders';
        this.loading = false;
        this.poList = [];
      }
    });
  }

  private resolveSelectedStatus(): void {
    const opts = this.statusOptions;
    const match = opts.find(o => o.toLowerCase() === this.selectedStatus.toLowerCase());
    this.selectedStatus = match || 'All Statuses';
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

    // PO Date range filter — previously bound to fromDate/toDate but never
    // actually applied here, so the date pickers had no effect on the table.
    if (this.fromDate) {
      list = list.filter(po => !!po.poDate && po.poDate >= this.fromDate);
    }
    if (this.toDate) {
      list = list.filter(po => !!po.poDate && po.poDate <= this.toDate);
    }

    return list;
  }

  // Reset pagination whenever any filter changes, so the user isn't stuck
  // on page 3 of a filtered list that now only has one page.
  onFilterChange(): void {
    this.poPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedSupplier = 'All Suppliers';
    this.selectedStatus = 'Approved';
    this.fromDate = '';
    this.toDate = '';
    this.poPage = 1;
    this.resolveSelectedStatus();
  }

  // ---- PO table pagination ----
  get totalPoPages(): number {
    return Math.ceil(this.filteredData.length / this.poPageSize) || 1;
  }

  get paginatedPoList(): POSummary[] {
    const start = (this.poPage - 1) * this.poPageSize;
    return this.filteredData.slice(start, start + this.poPageSize);
  }

  get poPageArray(): number[] {
    return Array.from({ length: this.totalPoPages }, (_, i) => i + 1);
  }

  get poPageRangeLabel(): string {
    if (this.filteredData.length === 0) return '0 - 0';
    const start = (this.poPage - 1) * this.poPageSize + 1;
    const end = Math.min(this.poPage * this.poPageSize, this.filteredData.length);
    return `${start} - ${end}`;
  }

  prevPoPage(): void {
    if (this.poPage > 1) this.poPage--;
  }

  nextPoPage(): void {
    if (this.poPage < this.totalPoPages) this.poPage++;
  }

  setPoPage(p: number): void {
    this.poPage = p;
  }

  // ---- Status badge styling — was hardcoded to "badge-approved" for every
  // row regardless of actual status. Now maps each real PO status to its
  // own class/icon so Pending / Partially Received / Completed etc. are
  // visually distinct instead of all showing as green "Approved". ----
  statusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return 'badge-approved';
    if (s.includes('partially')) return 'badge-partial';
    if (s.includes('received') || s.includes('completed') || s.includes('closed')) return 'badge-completed';
    if (s.includes('rejected') || s.includes('cancelled')) return 'badge-rejected';
    if (s.includes('submitted') || s.includes('pending')) return 'badge-pending-approval';
    return 'badge-draft';
  }

  statusIcon(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return 'pi-check';
    if (s.includes('partially')) return 'pi-box';
    if (s.includes('received') || s.includes('completed') || s.includes('closed')) return 'pi-check-square';
    if (s.includes('rejected') || s.includes('cancelled')) return 'pi-times';
    if (s.includes('submitted') || s.includes('pending')) return 'pi-clock';
    return 'pi-file';
  }

  // Human-friendly label — DB statuses are things like PARTIALLY_RECEIVED;
  // show "Partially Received" instead of the raw enum value. Leaves
  // already-friendly labels (like "All Statuses") untouched.
  statusLabel(status: string): string {
    if (!status) return '-';
    if (!status.includes('_') && status !== status.toUpperCase()) return status;
    return status
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
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
          // Real status is filled in below once we know what's actually been
          // generated — starting everyone at 'Pending' here was the bug:
          // this reset to Pending every time the modal reopened, even for
          // items that already had QR codes generated in a past session.
          qrStatus: 'Pending'
        });
      });
    }

    this.selectedPOItems = items;
    this.lineItemsPage = 1;
    this.showLineItemsModal = true;
    this.refreshQrStatusesForLineItems(po.poNumber);
  }

  // Marks each line item's QR status from what's actually in qr_transactions
  // — not from a locally-set flag that only ever lived in this session.
  private refreshQrStatusesForLineItems(poNumber: string): void {
    this.qrService.listForPo(poNumber).subscribe({
      next: (res) => {
        const generatedItemIds = new Set((res.data || []).map((q) => q.poItemId).filter((id) => id != null));
        this.selectedPOItems.forEach((item) => {
          if (item.poItemId != null && generatedItemIds.has(item.poItemId)) {
            item.qrStatus = 'Generated';
          }
        });
      }
      // If this fails, items just keep showing 'Pending' — no worse than before.
    });
  }

  // ---- Open Generate QR Modal (triggered from inside Line Items modal) ----
  openQrModal(item: POItem): void {
    this.selectedPOItems.forEach(i => i.selected = false);
    item.selected = true;
    this.selectedItem = item;

    this.boxReelNumber = `${item.boxNumber}-001`;
    this.expectedQtyPerBox = item.quantity;
    this.receivedQtyPerBox = null;
    this.location = '';
    this.recentQrPage = 1;
    this.qrDataUrl = null;
    this.qrCodeText = `WHQR-${item.poNumber}-001`;
    this.showQrSuccessAlert = false;
    this.generateError = '';
    // Only one modal overlay on screen at a time — leaving Line Items open
    // underneath was stacking two full-screen overlays, which is why the
    // Line Items modal's own Close button was visibly poking out to the
    // side (it's wider than the Generate QR modal).
    this.showLineItemsModal = false;
    this.showQrModal = true;
    this.loadRecentQrForPo(item.poNumber);
  }

  // "Recent QR Codes for this PO" — real, persisted history from the
  // backend (qr_transactions), not just what was generated this session.
  loadRecentQrForPo(poNumber: string): void {
    this.recentQrLoading = true;
    this.qrService.listForPo(poNumber).subscribe({
      next: (res) => {
        this.recentQrList = (res.data || []).map((q) => ({
          boxNo: q.itemCode || '-',
          qrCode: q.qrCode,
          generatedOn: q.generatedAt ? new Date(q.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
          location: q.location,
          itemName: q.itemName,
          receivedQtyPerBox: q.receivedQtyPerBox
        }));
        this.recentQrLoading = false;
      },
      error: () => { this.recentQrLoading = false; }
    });
  }

  selectLineItemForQR(item: POItem): void {
    this.selectedPOItems.forEach(i => i.selected = false);
    item.selected = true;
    this.selectedItem = item;

    this.boxReelNumber = `${item.boxNumber}-001`;
    this.expectedQtyPerBox = item.quantity;
    this.receivedQtyPerBox = null;
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
      this.qrService.generate(this.selectedItem.poNumber, this.selectedItem.poItemId, this.location || undefined, this.receivedQtyPerBox).subscribe({
        next: async (res) => {
          try {
            this.qrCodeText = res.data.qrCode || `WHQR-${this.selectedItem?.poNumber}-001`;
            this.qrDataUrl = await QRCode.toDataURL(this.qrCodeText, { width: 280, margin: 2 });
            this.showQrSuccessAlert = true;
            if (this.selectedItem) {
              this.selectedItem.qrStatus = 'Generated';
              this.loadRecentQrForPo(this.selectedItem.poNumber);
            }
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
    // Return to the Line Items modal the user came from, rather than
    // dropping them all the way back to the PO table.
    this.showLineItemsModal = true;
  }


  downloadQr(): void {
    if (!this.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.selectedItem?.poNumber || 'PO'}_${this.boxReelNumber || 'QR'}.png`;
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

  printQr(): void {
    if (!this.qrDataUrl || !this.selectedItem) return;
    this.renderPrintLabel({
      poNumber: this.selectedItem.poNumber,
      supplierName: this.selectedItem.supplierName,
      itemCode: this.selectedItem.boxNumber,
      description: this.selectedItem.description,
      orderedQtyLabel: `${this.selectedItem.quantity.toLocaleString()} ${this.selectedItem.uom || ''}`,
      boxReelNo: this.boxReelNumber,
      location: this.location || null,
      receivedQtyPerBox: this.receivedQtyPerBox,
      qrCodeText: this.qrCodeText || `WHQR-${this.selectedItem.poNumber}`,
      qrDataUrl: this.qrDataUrl
    });
  }

  // "Recent QR Codes for this PO" row print — was only ever printing the
  // bare QR image with no context. Now builds the same labelled printout as
  // the main Print button, using whatever was persisted for that QR
  // (location / received qty per box included).
  printRecentQr(row: RecentQRItem): void {
    QRCode.toDataURL(row.qrCode, { width: 280, margin: 2 }).then((dataUrl) => {
      this.renderPrintLabel({
        poNumber: this.selectedItem?.poNumber || '',
        supplierName: this.selectedItem?.supplierName || '',
        itemCode: row.boxNo,
        description: row.itemName || '',
        orderedQtyLabel: '',
        boxReelNo: row.boxNo,
        location: row.location || null,
        receivedQtyPerBox: row.receivedQtyPerBox ?? null,
        qrCodeText: row.qrCode,
        qrDataUrl: dataUrl
      });
    });
  }

  private renderPrintLabel(data: {
    poNumber: string; supplierName: string; itemCode: string; description: string;
    orderedQtyLabel: string; boxReelNo: string; location: string | null;
    receivedQtyPerBox: string | null; qrCodeText: string; qrDataUrl: string;
  }): void {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      alert('Please allow popups for this site');
      return;
    }
    const rows: string[] = [
      `<p><strong>PO Number:</strong> ${data.poNumber}</p>`,
      `<p><strong>Supplier:</strong> ${data.supplierName}</p>`,
      `<p><strong>Item Code:</strong> ${data.itemCode}</p>`,
      data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : '',
      data.orderedQtyLabel ? `<p><strong>Ordered Quantity:</strong> ${data.orderedQtyLabel}</p>` : '',
      `<p><strong>Box / Reel No:</strong> ${data.boxReelNo}</p>`,
      data.receivedQtyPerBox != null ? `<p><strong>Received Qty / Box:</strong> ${data.receivedQtyPerBox}</p>` : '',
      `<p><strong>Location:</strong> ${data.location || '-'}</p>`
    ].filter(Boolean);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${data.poNumber}</title>
          <style>
            body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:Arial, sans-serif; background:#f5f7fa; }
            .qr-container { text-align:center; padding:30px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:450px; }
            .qr-image { max-width:260px; height:auto; margin-bottom:15px; }
            .qr-code-text { font-family:monospace; font-weight:bold; font-size:16px; color:#1e293b; margin-bottom:20px; letter-spacing:0.5px; }
            .qr-details { font-size:13px; color:#374151; text-align:left; }
            .qr-details p { margin:6px 0; padding:4px 0; border-bottom:1px solid #f0f0f0; }
            .qr-details p:last-child { border-bottom:none; }
            .qr-details strong { color:#1f2937; display:inline-block; width:150px; }
            .title { font-size:18px; font-weight:700; color:#0284c7; margin-bottom:15px; }
            @media print { .no-print { display:none; } .qr-container { box-shadow:none; border:1px solid #e5e7eb; } }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="title">WMS PO QR Code</div>
            <img src="${data.qrDataUrl}" alt="QR Code" class="qr-image" />
            <div class="qr-code-text">${data.qrCodeText}</div>
            <div class="qr-details">
              ${rows.join('\n              ')}
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