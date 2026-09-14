import { Component, OnInit } from '@angular/core';
import * as QRCode from 'qrcode';
import { IssueService, DepartmentDto, ItemWithStockDto, IssueRequestDto } from '../../services/issue.service';

@Component({
  selector: 'app-issue',
  standalone: false,
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css'
})
export class IssueComponent implements OnInit {

  // ===================== Lookups =====================
  departments: DepartmentDto[] = [];
  items: ItemWithStockDto[] = [];
  loadingLookups = false;
  lookupError = '';

  // ===================== Step 1: Select item =====================
  itemSearchTerm = '';
  selectedItem: ItemWithStockDto | null = null;

  get filteredItems(): ItemWithStockDto[] {
    const term = this.itemSearchTerm.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter(i =>
      i.itemCode.toLowerCase().includes(term) || i.itemName.toLowerCase().includes(term)
    );
  }

  selectItem(item: ItemWithStockDto): void {
    this.selectedItem = item;
    this.issueQty = 0;
    this.departmentId = null;
    this.referenceNo = '';
    this.remarks = '';
    this.actionError = '';
  }

  clearSelectedItem(): void {
    this.selectedItem = null;
  }

  // ===================== Step 2-3: Issue details =====================
  issueQty = 0;
  departmentId: number | null = null;
  referenceNo = '';
  remarks = '';
  submitting = false;
  actionError = '';

  get overStock(): boolean {
    return !!this.selectedItem && this.issueQty > this.selectedItem.availableQty;
  }

  // ===================== Recent issue transactions =====================
  issuingData: IssueRequestDto[] = [];
  loading = false;
  loadError = '';

  // ===================== QR modal (kept — same download/print UX as before) =====================
  showQrModal = false;
  qrDataUrl: string | null = null;
  generating = false;
  qrSelected: IssueRequestDto | null = null;

  constructor(private issueService: IssueService) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadRecent();
  }

  loadLookups(): void {
    this.loadingLookups = true;
    this.lookupError = '';
    this.issueService.listDepartments().subscribe({
      next: (res) => { this.departments = res.data || []; },
      error: (err) => { this.lookupError = err?.error?.message || 'Failed to load departments'; }
    });
    this.issueService.listItems().subscribe({
      next: (res) => { this.items = res.data || []; this.loadingLookups = false; },
      error: (err) => { this.lookupError = err?.error?.message || 'Failed to load items'; this.loadingLookups = false; }
    });
  }

  loadRecent(): void {
    this.loading = true;
    this.loadError = '';
    this.issueService.list().subscribe({
      next: (res) => { this.issuingData = res.data || []; this.loading = false; },
      error: (err) => { this.loadError = err?.error?.message || 'Failed to load issue transactions'; this.loading = false; }
    });
  }

  getTotalIssued(): number {
    return this.issuingData.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.issuedQty || 0), 0), 0);
  }

  totalIssuedFor(req: IssueRequestDto): number {
    return req.items.reduce((s, i) => s + (i.issuedQty || 0), 0);
  }

  // "Issue & Update Stock" — one button, matching the screenshot: creates the
  // issue request and immediately issues/decrements stock against it in the
  // same action (no separate supervisor approval step in this flow).
  issueAndUpdateStock(): void {
    if (!this.selectedItem || !this.departmentId || !this.issueQty || this.issueQty <= 0) {
      this.actionError = 'Select an item, department and a valid quantity.';
      return;
    }
    if (this.overStock) {
      this.actionError = `Only ${this.selectedItem.availableQty} ${this.selectedItem.uomCode} available.`;
      return;
    }

    this.submitting = true;
    this.actionError = '';

    // Purely a free-text cross-reference for humans (e.g. a batch or job
    // number) — never validated against VISIPAK, never synced anywhere.
    // See the Issue Verification design discussion: WMS stock stays
    // WMS-internal; this is just a breadcrumb for someone tracing it later.
    const combinedRemarks = [
      this.referenceNo ? `Ref: ${this.referenceNo}` : '',
      this.remarks
    ].filter(Boolean).join(' — ') || undefined;

    this.issueService.create({
      departmentId: this.departmentId,
      items: [{ itemId: this.selectedItem.itemId, requestedQty: this.issueQty }],
      remarks: combinedRemarks
    }).subscribe({
      next: (createRes) => {
        const req = createRes.data;
        const reqItem = req.items[0];
        this.issueService.issueAndUpdateStock(req.issueRequestNumber, [
          { issueRequestItemId: reqItem.issueRequestItemId, issuedQty: this.issueQty }
        ]).subscribe({
          next: () => {
            this.submitting = false;
            this.selectedItem = null;
            this.issueQty = 0;
            this.departmentId = null;
            this.referenceNo = '';
            this.remarks = '';
            this.loadLookups(); // refresh available stock
            this.loadRecent();
          },
          error: (err) => {
            this.submitting = false;
            this.actionError = err?.error?.message || 'Failed to issue and update stock.';
          }
        });
      },
      error: (err) => {
        this.submitting = false;
        this.actionError = err?.error?.message || 'Failed to create issue request.';
      }
    });
  }

  // ===================== QR modal (unchanged behaviour) =====================

  openQrModal(item: IssueRequestDto): void {
    this.qrSelected = item;
    this.qrDataUrl = null;
    this.showQrModal = true;
    this.generateQr();
  }

  async generateQr(): Promise<void> {
    if (!this.qrSelected) return;
    this.generating = true;
    try {
      this.qrDataUrl = await QRCode.toDataURL(this.qrSelected.issueRequestNumber, { width: 280, margin: 2 });
    } finally {
      this.generating = false;
    }
  }

  closeQrModal(): void {
    this.showQrModal = false;
    this.qrSelected = null;
    this.qrDataUrl = null;
  }

  downloadQr(): void {
    if (!this.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `${this.qrSelected?.issueRequestNumber || 'issue'}.png`;
    link.click();
  }

  printQr(): void {
    if (!this.qrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=500,height=500');
    if (!printWindow) return;
    printWindow.document.write(`<img src="${this.qrDataUrl}" onload="window.print()" />`);
    printWindow.document.close();
  }
}
