import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { ScannerService } from '../../services/scanner.service';
import { ReceivingService, ReceivingDto } from '../../services/receiving.service';

interface DocumentSet {
  deliveryNote: File | null;
  purchaseOrder: File | null;
  purchaseRequisition: File | null;
  materialRejectedReport: File | null;
}

interface ScannedItem {
  poNumber: string;
  supplierName: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  poItemId: number;
  receivedQtyPerBox: number | null;
}

interface BoxRow {
  id: number;
  boxReelNo: string;
  serialNo: string;
  qty: number;
  editing: boolean;
}

@Component({
  selector: 'app-recieve',
  standalone: false,
  templateUrl: './recieve.component.html',
  styleUrl: './recieve.component.css'
})
export class RecieveComponent implements OnInit, OnDestroy {

  // ===================== Step tracker =====================
  // 1 = Scan/Select, 2 = Receive Details, 3 = Verify & Upload.
  // Approval itself is a separate step that now happens on the "Receiving
  // Approval" (porecieve) page — see confirmActive() below, which hands off
  // there instead of showing an inline Step 4.
  step: 1 | 2 | 3 = 1;

  // ===================== Step 1: Scan =====================
  scannerEnabled = true;
  cameraStarted = false;
  showStartScan = true; // camera only turns on once the user taps "Start Scanning"
  scanLoading = false;
  scanError: string | null = null;
  manualCode = '';
  showManualEntry = false;

  private html5Qr?: Html5Qrcode;
  readonly SCANNER_ELEMENT_ID = 'rw-scanner-video';

  // ===================== Step 2: Receive Details (multi box/reel/serial) =====================
  scannedItem: ScannedItem | null = null;
  scannedQrCode: string | null = null;
  boxRows: BoxRow[] = [];
  private nextBoxRowId = 1;
  recordLoading = false;
  recordError: string | null = null;

  get receiveQty(): number {
    return this.boxRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }

  // ===================== Step 3/4: active record in progress =====================
  activeReceiving: ReceivingDto | null = null;

  tempDocuments: DocumentSet = this.emptyDocuments();
  saveError = '';
  saving = false;

  // ===================== Queues (existing functionality, preserved) =====================
  allReceivings: ReceivingDto[] = [];
  loading = false;
  loadError = '';
  searchTerm = '';

  get inProgressList(): ReceivingDto[] {
    return this.filterList(this.allReceivings.filter(r => r.status === 'IN_PROGRESS'));
  }

  get pendingApprovalList(): ReceivingDto[] {
    return this.filterList(this.allReceivings.filter(r => r.approvalStatus === 'PENDING_APPROVAL'));
  }

  // Approved locally, but the VISIPACK push failed — previously a dead end;
  // see retryPush() below.
  get pushFailedList(): ReceivingDto[] {
    return this.filterList(this.allReceivings.filter(r => r.qcStatus === 'PUSH_FAILED'));
  }

  // Rejected during the approval decision — previously a dead end; see
  // reopenForCorrection() below.
  get rejectedList(): ReceivingDto[] {
    return this.filterList(this.allReceivings.filter(r => r.status === 'REJECTED'));
  }

  retryingReceivingNumber: string | null = null;
  reopeningReceivingNumber: string | null = null;

  private filterList(list: ReceivingDto[]): ReceivingDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(r =>
      r.poNumber.toLowerCase().includes(term) ||
      r.receivingNumber.toLowerCase().includes(term)
    );
  }

  constructor(
    private router: Router,
    private scannerService: ScannerService,
    private receivingService: ReceivingService
  ) { }

  ngOnInit(): void {
    this.loadAll();
    // Camera no longer auto-starts — the user taps "Start Scanning" first.
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // ===================== Load queues =====================
  loadAll(): void {
    this.loading = true;
    this.loadError = '';
    this.receivingService.list().subscribe({
      next: (res) => {
        this.allReceivings = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load receiving records';
        this.loading = false;
      }
    });
  }

  private emptyDocuments(): DocumentSet {
    return { deliveryNote: null, purchaseOrder: null, purchaseRequisition: null, materialRejectedReport: null };
  }

  // ===================== Navigation between steps =====================

  // Start fresh at Step 1 (used by "Scan Another" / initial load / Cancel)
  goToScanStep(): void {
    this.step = 1;
    this.scannedItem = null;
    this.scannedQrCode = null;
    this.boxRows = [];
    this.recordError = null;
    this.scanError = null;
    this.manualCode = '';
    this.showManualEntry = false;
    this.showStartScan = true;
    this.stopCamera();
  }

  // "Start Scanning" — camera only activates on this explicit tap.
  beginScanning(): void {
    this.showStartScan = false;
    this.scanError = null;
    setTimeout(() => this.startCamera(), 0);
  }

  cancelFlow(): void {
    this.stopCamera();
    this.activeReceiving = null;
    this.scannedItem = null;
    this.scannedQrCode = null;
    this.tempDocuments = this.emptyDocuments();
    this.saveError = '';
    this.goToScanStep();
  }

  // Resume an already-scanned record (skips straight to Verify & Upload)
  resumeInProgress(r: ReceivingDto): void {
    this.stopCamera();
    this.activeReceiving = r;
    this.tempDocuments = this.emptyDocuments();
    this.saveError = '';
    this.step = 3;
  }

  // A record already waiting on a supervisor decision doesn't have anything
  // left to do here — approval itself now lives on the "Receiving Approval"
  // (porecieve) page, so just send the user there.
  resumePendingApproval(r: ReceivingDto): void {
    this.router.navigate(['/porecieve']);
  }

  // "Retry Push" — for a receiving that was approved but failed to push to
  // VISIPACK (qcStatus = PUSH_FAILED). Re-runs the exact same push the
  // approval step attempted; on success it clears from Attention Required
  // automatically since qcStatus moves to PENDING.
  retryPush(r: ReceivingDto): void {
    this.retryingReceivingNumber = r.receivingNumber;
    this.receivingService.retryPush(r.receivingNumber).subscribe({
      next: () => {
        this.retryingReceivingNumber = null;
        alert(`✅ ${r.receivingNumber} pushed to VISIPACK successfully.`);
        this.loadAll();
      },
      error: (err) => {
        this.retryingReceivingNumber = null;
        alert(err?.error?.message || `Retry failed — VISIPACK may still be unreachable. Try again shortly.`);
        this.loadAll();
      }
    });
  }

  // "Reopen for Correction" — for a rejected receiving. Sends it back to
  // IN_PROGRESS on the backend, then drops the user straight into Step 3
  // (Verify & Upload) to review/re-confirm and resubmit for approval,
  // instead of leaving REJECTED as a permanent dead end.
  reopenForCorrection(r: ReceivingDto): void {
    this.reopeningReceivingNumber = r.receivingNumber;
    this.receivingService.reopenRejected(r.receivingNumber).subscribe({
      next: (res) => {
        this.reopeningReceivingNumber = null;
        this.stopCamera();
        this.activeReceiving = res.data;
        this.tempDocuments = this.emptyDocuments();
        this.saveError = '';
        this.step = 3;
        this.loadAll();
      },
      error: (err) => {
        this.reopeningReceivingNumber = null;
        alert(err?.error?.message || 'Failed to reopen this receiving.');
      }
    });
  }

  // ===================== Step 1: Camera scanning =====================

  startCamera(): void {
    this.scanError = null;

    if (!window.isSecureContext) {
      this.scanError = 'Camera access requires HTTPS (or localhost). Open this page over a secure connection, or use "Enter Code Manually" below.';
      console.error('[rw-scan] blocked: not a secure context (window.isSecureContext === false)');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.scanError = 'This browser/context has no camera API available (navigator.mediaDevices is missing). Use "Enter Code Manually" below instead.';
      console.error('[rw-scan] blocked: navigator.mediaDevices unavailable — old browser, stripped-down WebView, or an iframe without camera permission delegated.');
      return;
    }

    // Running inside an iframe without `allow="camera"` on the parent frame is
    // a common, silent cause of camera failures that don't map to a normal
    // DOMException name — flag it up front so it's not confused with a
    // hardware/permission problem.
    if (window.self !== window.top) {
      console.warn('[rw-scan] page is running inside an iframe — if the camera fails, check the parent frame allows: attribute includes "camera".');
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
          this.scanError = 'No camera found on this device. Use "Enter Code Manually" below instead.';
          console.error('[rw-scan] getCameras() resolved with an empty list — no camera detected by the browser.');
          return;
        }
        this.html5Qr!.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => this.onScanSuccess(decodedText),
          () => { /* per-frame "no QR found yet" — ignore */ }
        ).catch((err) => this.onCameraError(err, 'start'));
      })
      .catch((err) => this.onCameraError(err, 'getCameras'));
  }

  private stopCamera(): void {
    if (this.html5Qr && this.html5Qr.getState() === Html5QrcodeScannerState.SCANNING) {
      this.html5Qr.stop().catch(() => {});
    }
    this.cameraStarted = false;
  }

  private onCameraError(error: any, stage: 'getCameras' | 'start'): void {
    // Full raw error, always logged — check DevTools → Console for the exact
    // name/message the browser threw when the on-screen summary isn't enough.
    console.error(`[rw-scan] camera error during ${stage}():`, error?.name, '-', error?.message || error, error);

    const name = error?.name || '';
    const rawMessage = error?.message || String(error);

    if (name === 'NotAllowedError' || /permission/i.test(rawMessage)) {
      this.scanError = 'Camera permission denied. Allow camera access for this site, or use "Enter Code Manually" below.';
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      this.scanError = 'No usable camera found. Use "Enter Code Manually" below instead.';
    } else if (name === 'NotReadableError') {
      this.scanError = 'Camera is already in use by another app.';
    } else {
      // Include the raw name/message so it's actionable without opening DevTools.
      const detail = name || rawMessage || 'unknown error';
      this.scanError = `Failed to access camera (${detail}). Use "Enter Code Manually" below instead.`;
    }
  }

  toggleManualEntry(): void {
    this.showManualEntry = !this.showManualEntry;
  }

  submitManualCode(): void {
    const code = this.manualCode.trim();
    if (!code) return;
    this.lookupCode(code);
  }

  onScanSuccess(qrCode: string): void {
    if (!this.scannerEnabled) return;
    this.scannerEnabled = false;
    this.stopCamera();
    this.lookupCode(qrCode);
  }

  private lookupCode(qrCode: string): void {
    this.scanLoading = true;
    this.scanError = null;

    this.scannerService.scan(qrCode).subscribe({
      next: (res) => {
        this.scanLoading = false;
        if (res.data.poItemId == null) {
          this.scanError = 'This QR code has no line item attached — cannot receive against it.';
          this.scannerEnabled = true;
          if (!this.showStartScan) this.startCamera();
          return;
        }
        this.scannedQrCode = qrCode;
        this.scannedItem = {
          poNumber: res.data.poNumber,
          supplierName: res.data.supplierName,
          itemCode: res.data.itemCode || '',
          itemName: res.data.itemName || '',
          orderedQty: res.data.orderedQty || 0,
          poItemId: res.data.poItemId,
          receivedQtyPerBox: res.data.receivedQtyPerBox != null ? Number(res.data.receivedQtyPerBox) : null
        };
        // Seed one box/reel row so staff can adjust it, split it into more
        // boxes, or delete/re-add before recording — matches the multi-box
        // "Receiving Verification" table from the reference screens.
        // Prefer the "Expected Qty (per box)" set back in PO QR Generator;
        // fall back to the full ordered qty only if none was set there.
        const seedQty = this.scannedItem.receivedQtyPerBox ?? res.data.orderedQty ?? 0;
        this.boxRows = [this.makeBoxRow(seedQty)];
        this.step = 2;
      },
      error: (err) => {
        this.scanLoading = false;
        this.scanError = err?.error?.message || 'Invalid QR code or scan failed.';
        this.scannerEnabled = true;
        if (!this.showStartScan) setTimeout(() => this.startCamera(), 1500);
      }
    });
  }

  // ===================== Step 2: Multi box/reel rows =====================

  private makeBoxRow(qty: number): BoxRow {
    const n = this.boxRows.length + 1;
    const boxReelNo = this.scannedItem ? `${this.scannedItem.itemCode}-${String(n).padStart(3, '0')}` : `BOX-${n}`;
    const serialNo = this.scannedItem ? `${this.scannedItem.poNumber}-${boxReelNo}` : boxReelNo;
    return { id: this.nextBoxRowId++, boxReelNo, serialNo, qty, editing: false };
  }

  addBoxRow(): void {
    this.boxRows.push(this.makeBoxRow(0));
  }

  editBoxRow(row: BoxRow): void {
    row.editing = true;
  }

  saveBoxRow(row: BoxRow): void {
    row.editing = false;
  }

  deleteBoxRow(row: BoxRow): void {
    this.boxRows = this.boxRows.filter(r => r.id !== row.id);
  }

  // ===================== Step 2: Accept & Record =====================

  acceptAndRecord(): void {
    if (!this.scannedItem || !this.scannedQrCode) return;
    if (this.boxRows.length === 0 || this.receiveQty <= 0) {
      this.recordError = 'Add at least one box/reel with a valid quantity.';
      return;
    }

    this.recordLoading = true;
    this.recordError = null;

    // The backend records one total received qty per PO line item — the
    // individual box/reel/serial breakdown above is a receiving worksheet
    // for staff to get the count right; only the summed total is posted.
    this.receivingService.create({
      qrCode: this.scannedQrCode,
      items: [{ poItemId: this.scannedItem.poItemId, receivedQty: this.receiveQty }]
    }).subscribe({
      next: (res) => {
        this.recordLoading = false;
        this.activeReceiving = res.data;
        this.tempDocuments = this.emptyDocuments();
        this.saveError = '';
        this.step = 3;
        this.loadAll();
      },
      error: (err) => {
        this.recordLoading = false;
        this.recordError = err?.error?.message || 'Failed to create receiving record.';
      }
    });
  }


  // ===================== Step 3: Documents + Confirm =====================

  onFileSelected(event: Event, key: keyof DocumentSet): void {
    const input = event.target as HTMLInputElement;
    this.tempDocuments[key] = input.files && input.files.length ? input.files[0] : null;
    this.saveError = '';
  }

  hasAnyDocument(): boolean {
    return Object.values(this.tempDocuments).some(file => file !== null);
  }

  saveDocuments(): void {
    if (!this.activeReceiving) return;

    const receivingNumber = this.activeReceiving.receivingNumber;
    const allDocConfigs: { type: string; file: File | null }[] = [
      { type: 'DELIVERY_NOTE', file: this.tempDocuments.deliveryNote },
      { type: 'PURCHASE_ORDER', file: this.tempDocuments.purchaseOrder },
      { type: 'PURCHASE_REQUISITION', file: this.tempDocuments.purchaseRequisition },
      { type: 'MATERIAL_REJECTED_REPORT', file: this.tempDocuments.materialRejectedReport }
    ];

    const uploads = allDocConfigs.filter(u => u.file !== null) as { type: string; file: File }[];
    if (uploads.length === 0) return;

    this.saving = true;
    this.saveError = '';

    forkJoin(
      uploads.map(u =>
        this.receivingService.uploadDocument(receivingNumber, u.type, u.file).pipe(catchError(() => of(null)))
      )
    ).subscribe((results) => {
      this.saving = false;
      if (results.some(r => r === null)) {
        this.saveError = 'One or more documents failed to upload — please try again.';
        return;
      }
      this.tempDocuments = this.emptyDocuments();
      // Refresh the active record so the "Uploaded" state reflects the new documents.
      if (this.activeReceiving) {
        this.receivingService.get(this.activeReceiving.receivingNumber).subscribe({
          next: (res) => { this.activeReceiving = res.data; }
        });
      }
      this.loadAll();
    });
  }

  // "Confirm" submits this receiving for approval (backend flips it to
  // PENDING_APPROVAL). From here the supervisor decision itself happens on
  // the separate "Receiving Approval" page, so we hand off there instead of
  // showing an inline Step 4.
  confirmActive(): void {
    if (!this.activeReceiving) return;

    this.saving = true;
    const receivingNumber = this.activeReceiving.receivingNumber;
    this.receivingService.confirm(receivingNumber).subscribe({
      next: () => {
        this.saving = false;
        this.loadAll();
        alert(`✅ ${receivingNumber} confirmed and sent to Receiving Approval.`);
        this.activeReceiving = null;
        this.goToScanStep();
        this.router.navigate(['/porecieve']);
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.message || 'Failed to confirm receiving.';
      }
    });
  }
}