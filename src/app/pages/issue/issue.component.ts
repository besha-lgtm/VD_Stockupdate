import { Component, OnInit, OnDestroy } from '@angular/core';
import * as QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { IssueService, DepartmentDto, ItemWithStockDto, IssueRequestDto } from '../../services/issue.service';

interface ApprovalEdit {
  issuedQty: number;
}

@Component({
  selector: 'app-issue',
  standalone: false,
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css'
})
export class IssueComponent implements OnInit, OnDestroy {

  // ===================== Step tracker =====================
  // Mirrors Receive & Approve's single-screen wizard: one step is active
  // at a time in the main card, with a side panel showing the queues.
  // 1 = Scan/Select, 2 = Item & Stock + Issue Details, 3 = Issue Verification
  step: 1 | 2 | 3 = 1;

  // ===================== Lookups =====================
  departments: DepartmentDto[] = [];
  items: ItemWithStockDto[] = [];
  loadingLookups = false;
  lookupError = '';

  // ===================== Step 1: Search / manual entry =====================
  itemSearchTerm = '';

  get filteredItems(): ItemWithStockDto[] {
    const term = this.itemSearchTerm.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter(i =>
      i.itemCode.toLowerCase().includes(term) || i.itemName.toLowerCase().includes(term)
    );
  }

  // ===================== Step 1: Scan Item QR Code =====================
  scannerEnabled = true;
  cameraStarted = false;
  showStartScan = true; // camera only turns on once the user taps "Start Scanning"
  scanLoading = false;
  scanError: string | null = null;
  manualCode = '';
  showManualEntry = false;

  private html5Qr?: Html5Qrcode;
  readonly SCANNER_ELEMENT_ID = 'iw-scanner-video';

  // ===================== Step 2: selected item + issue details =====================
  selectedItem: ItemWithStockDto | null = null;
  issueQty = 0;
  departmentId: number | null = null;
  referenceNo = '';
  remarks = '';
  submitting = false;
  actionError = '';

  get overStock(): boolean {
    return !!this.selectedItem && this.issueQty > this.selectedItem.availableQty;
  }

  // ===================== Step 3: active record awaiting verification =====================
  activeRequest: IssueRequestDto | null = null;
  approvalEdits: Record<number, ApprovalEdit> = {};
  deciding = false;

  // ===================== Queues (side panel) =====================
  issuingData: IssueRequestDto[] = [];
  loading = false;
  loadError = '';
  searchTerm = '';

  get pendingApprovalList(): IssueRequestDto[] {
    return this.filterList(this.issuingData.filter(r => r.approvalStatus === 'PENDING_APPROVAL'));
  }

  get recentList(): IssueRequestDto[] {
    return this.issuingData;
  }

  // "Recent Issue Transactions" table shows the latest 8 by default;
  // toggled open to the full list on demand so the page stays scannable.
  showAllHistory = false;

  private filterList(list: IssueRequestDto[]): IssueRequestDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(r =>
      r.issueRequestNumber.toLowerCase().includes(term) ||
      (r.departmentName || '').toLowerCase().includes(term)
    );
  }

  getTotalIssued(): number {
    return this.issuingData.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.issuedQty || 0), 0), 0);
  }

  totalIssuedFor(req: IssueRequestDto): number {
    return req.items.reduce((s, i) => s + (i.issuedQty || 0), 0);
  }

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

  ngOnDestroy(): void {
    this.stopCamera();
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
      next: (res) => {
        this.issuingData = res.data || [];
        this.loading = false;
      },
      error: (err) => { this.loadError = err?.error?.message || 'Failed to load issue transactions'; this.loading = false; }
    });
  }

  // ===================== Navigation between steps =====================

  // Start fresh at Step 1 (used by "Scan Another" / initial load / Cancel)
  goToScanStep(): void {
    this.step = 1;
    this.selectedItem = null;
    this.issueQty = 0;
    this.departmentId = null;
    this.referenceNo = '';
    this.remarks = '';
    this.actionError = '';
    this.scanError = null;
    this.manualCode = '';
    this.showManualEntry = false;
    this.showStartScan = true;
    this.stopCamera();
  }

  cancelFlow(): void {
    this.activeRequest = null;
    this.goToScanStep();
  }

  // Resume a request that's already waiting on a supervisor decision
  resumePendingApproval(r: IssueRequestDto): void {
    this.stopCamera();
    this.activeRequest = r;
    this.buildApprovalEdits(r);
    this.step = 3;
  }

  private buildApprovalEdits(r: IssueRequestDto): void {
    this.approvalEdits = {};
    for (const item of r.items) {
      this.approvalEdits[item.issueRequestItemId] = { issuedQty: item.requestedQty };
    }
  }

  // ===================== Step 1: Select item =====================

  selectItem(item: ItemWithStockDto): void {
    this.selectedItem = item;
    this.issueQty = 0;
    this.departmentId = null;
    this.referenceNo = '';
    this.remarks = '';
    this.actionError = '';
    this.step = 2;
  }

  clearSelectedItem(): void {
    this.goToScanStep();
  }

  // ===================== Step 1: Scan Item QR Code =====================
  // Mirrors Receiving Verification's camera scan (recieve.component) — same
  // html5-qrcode setup, just matched against the item list already loaded
  // here instead of a backend QR lookup. Item QR/barcode labels are
  // expected to encode the item code (e.g. "REELSEP09").

  beginScanning(): void {
    this.showStartScan = false;
    this.scanError = null;
    setTimeout(() => this.startCamera(), 0);
  }

  startCamera(): void {
    this.scanError = null;

    if (!window.isSecureContext) {
      this.scanError = 'Camera access requires HTTPS (or localhost). Open this page over a secure connection, or use "Enter Item Code Manually" below.';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.scanError = 'This browser/context has no camera API available. Use "Enter Item Code Manually" below instead.';
      return;
    }

    const el = document.getElementById(this.SCANNER_ELEMENT_ID);
    if (!el) {
      // View not painted yet — try again shortly.
      setTimeout(() => this.startCamera(), 50);
      return;
    }

    this.html5Qr = new Html5Qrcode(this.SCANNER_ELEMENT_ID);
    this.cameraStarted = true;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras || !cameras.length) {
          this.scanError = 'No camera found on this device. Use "Enter Item Code Manually" below instead.';
          return;
        }
        this.html5Qr!.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => this.onScanSuccess(decodedText),
          () => { /* per-frame "no QR found yet" — ignore */ }
        ).catch((err) => this.onCameraError(err));
      })
      .catch((err) => this.onCameraError(err));
  }

  private stopCamera(): void {
    if (this.html5Qr && this.html5Qr.getState() === Html5QrcodeScannerState.SCANNING) {
      this.html5Qr.stop().catch(() => {});
    }
    this.cameraStarted = false;
  }

  private onCameraError(error: any): void {
    console.error('[issue-scan] camera error:', error?.name, '-', error?.message || error);
    const name = error?.name || '';
    const rawMessage = error?.message || String(error);

    if (name === 'NotAllowedError' || /permission/i.test(rawMessage)) {
      this.scanError = 'Camera permission denied. Allow camera access for this site, or use "Enter Item Code Manually" below.';
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      this.scanError = 'No usable camera found. Use "Enter Item Code Manually" below instead.';
    } else if (name === 'NotReadableError') {
      this.scanError = 'Camera is already in use by another app.';
    } else {
      this.scanError = `Failed to access camera (${name || rawMessage || 'unknown error'}). Use "Enter Item Code Manually" below instead.`;
    }
  }

  toggleManualEntry(): void {
    this.showManualEntry = !this.showManualEntry;
  }

  submitManualCode(): void {
    const code = this.manualCode.trim();
    if (!code) return;
    this.lookupScannedCode(code);
  }

  onScanSuccess(code: string): void {
    if (!this.scannerEnabled) return;
    this.scannerEnabled = false;
    this.stopCamera();
    this.lookupScannedCode(code);
  }

  // Matches the scanned/typed code against the already-loaded item list —
  // by item code first (what the printed label is expected to carry), then
  // falls back to item name so a stock/bin QR encoding either still works.
  private lookupScannedCode(code: string): void {
    this.scanLoading = true;
    this.scanError = null;

    const needle = code.trim().toLowerCase();
    const match = this.items.find(i =>
      i.itemCode.toLowerCase() === needle || i.itemName.toLowerCase() === needle
    );

    this.scanLoading = false;
    if (!match) {
      this.scanError = `No item found for code "${code}". Try "Enter Item Code Manually" or search below.`;
      this.scannerEnabled = true;
      if (!this.showStartScan) setTimeout(() => this.startCamera(), 1500);
      return;
    }

    this.selectItem(match);
    this.showStartScan = true; // reset the gate for next time
    this.manualCode = '';
    this.showManualEntry = false;
  }

  // ===================== Step 2: Issue Details -> Submit for Verification =====================
  // Creates the issue request and locks it in (Confirm) in one action,
  // sending it to the Issue Verification queue for a supervisor to Approve
  // or Reject. Real stock is NOT touched here — only once a supervisor
  // approves (see decide() below), matching Receiving Verification's
  // Confirm -> Approval flow.
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
        this.issueService.confirm(req.issueRequestNumber).subscribe({
          next: () => {
            // Refresh to pick up PENDING_APPROVAL status before moving to Step 3.
            this.issueService.get(req.issueRequestNumber).subscribe({
              next: (res) => {
                this.submitting = false;
                this.activeRequest = res.data;
                this.buildApprovalEdits(res.data);
                this.step = 3;
                this.loadRecent();
              }
            });
          },
          error: (err) => {
            this.submitting = false;
            this.actionError = err?.error?.message || 'Failed to submit for verification.';
          }
        });
      },
      error: (err) => {
        this.submitting = false;
        this.actionError = err?.error?.message || 'Failed to create issue request.';
      }
    });
  }

  // ===================== Step 3: Issue Verification decision =====================
  // Supervisor Approve/Reject on the active pending issue request. Approve
  // is where stock actually decrements on the backend (applyIssuance/decideApproval).
  decide(decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.activeRequest) return;
    const r = this.activeRequest;

    const itemDecisions = r.items.map(item => ({
      issueRequestItemId: item.issueRequestItemId,
      issuedQty: decision === 'APPROVED' ? (this.approvalEdits[item.issueRequestItemId]?.issuedQty ?? item.requestedQty) : 0
    }));

    this.deciding = true;
    this.issueService.decideApproval(r.issueRequestNumber, decision, itemDecisions).subscribe({
      next: () => {
        this.deciding = false;
        alert(
          decision === 'APPROVED'
            ? `✅ ${r.issueRequestNumber} approved and stock updated.`
            : `❌ ${r.issueRequestNumber} rejected.`
        );
        this.activeRequest = null;
        this.loadLookups(); // refresh available stock (changes on Approve)
        this.loadRecent();
        this.goToScanStep();
      },
      error: (err) => {
        this.deciding = false;
        this.actionError = err?.error?.message || `Failed to ${decision === 'APPROVED' ? 'approve' : 'reject'}.`;
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
