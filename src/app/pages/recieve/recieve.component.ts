import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReceivingService, ReceivingDto } from '../../services/receiving.service';

interface DocumentSet {
  deliveryNote: File | null;
  purchaseOrder: File | null;
  purchaseRequisition: File | null;
  materialRejectedReport: File | null;
}

interface ReceivingItem {
  receivingNumber: string; // hidden from template, needed to call the API
  receivingItemId: number;
  poNumber: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  documentsUploaded: boolean;
  documents: DocumentSet;
  accepted: boolean;
}

@Component({
  selector: 'app-recieve',
  standalone: false,
  templateUrl: './recieve.component.html',
  styleUrl: './recieve.component.css'
})
export class RecieveComponent implements OnInit {

  receivingData: ReceivingItem[] = [];
  loading = false;
  loadError = '';

  searchTerm = '';

  showUploadPopup = false;
  selectedItem: ReceivingItem | null = null;

  get filteredData(): ReceivingItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.receivingData;
    return this.receivingData.filter(item =>
      item.poNumber.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }

  constructor(
    private receivingService: ReceivingService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadReceivings();
  }

  // Flatten each ReceivingDto's line items into one row per item, matching
  // this screen's existing (pre-integration) table shape.
  private toRows(receivings: ReceivingDto[]): ReceivingItem[] {
    const rows: ReceivingItem[] = [];
    for (const r of receivings) {
      // Only show what still needs action here — VERIFIED/REJECTED move on to Approval.
      if (r.status !== 'IN_PROGRESS') continue;
      for (const item of r.items) {
        rows.push({
          receivingNumber: r.receivingNumber,
          receivingItemId: item.receivingItemId,
          poNumber: r.poNumber,
          description: item.itemName,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          documentsUploaded: (r.documents?.length || 0) > 0,
          documents: this.emptyDocuments(),
          accepted: r.status !== 'IN_PROGRESS'
        });
      }
    }
    return rows;
  }

  loadReceivings(): void {
    this.loading = true;
    this.loadError = '';
    this.receivingService.list().subscribe({
      next: (res) => {
        // Trust the backend's per-receiving-record status directly — do NOT
        // overlay poStatusService here. It tracks "accepted" by PO number
        // only, which is wrong now that one PO can have several line items
        // (each its own receiving record, confirmed independently). Using
        // it here previously caused confirming line item A to incorrectly
        // disable the button for line item B on the same PO.
        this.receivingData = this.toRows(res.data || []);
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

  tempDocuments: DocumentSet = this.emptyDocuments();
  submitted = false;
  saveError = '';
  saving = false;

  openUploadPopup(item: ReceivingItem) {
    this.selectedItem = item;
    this.tempDocuments = { ...item.documents };
    this.saveError = '';
    this.submitted = false;
    this.showUploadPopup = true;
  }

  closeUploadPopup() {
    this.showUploadPopup = false;
    this.selectedItem = null;
    this.tempDocuments = this.emptyDocuments();
    this.saveError = '';
    this.submitted = false;
  }

  onFileSelected(event: Event, key: keyof DocumentSet) {
    const input = event.target as HTMLInputElement;
    this.tempDocuments[key] = input.files && input.files.length ? input.files[0] : null;
    this.saveError = '';
  }

  hasAnyDocument(): boolean {
    return Object.values(this.tempDocuments).some(file => file !== null);
  }

  // "Bills and documents upload" — uploads selected files to WMS
  // (POST /receiving-verifications/{no}/documents), one call per selected file.
  saveDocuments() {
    this.submitted = true;
    if (!this.selectedItem) {
      return;
    }

    const receivingNumber = this.selectedItem.receivingNumber;
    const allDocConfigs: { type: string; file: File | null }[] = [
      { type: 'DELIVERY_NOTE', file: this.tempDocuments.deliveryNote },
      { type: 'PURCHASE_ORDER', file: this.tempDocuments.purchaseOrder },
      { type: 'PURCHASE_REQUISITION', file: this.tempDocuments.purchaseRequisition },
      { type: 'MATERIAL_REJECTED_REPORT', file: this.tempDocuments.materialRejectedReport }
    ];

    const uploads = allDocConfigs.filter(u => u.file !== null) as { type: string; file: File }[];

    // If no files were selected, simply close modal and keep state
    if (uploads.length === 0) {
      this.showUploadPopup = false;
      this.selectedItem = null;
      this.tempDocuments = this.emptyDocuments();
      this.saveError = '';
      return;
    }

    this.saving = true;

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
      if (this.selectedItem) {
        this.selectedItem.documents = { ...this.tempDocuments };
        this.selectedItem.documentsUploaded = true;
      }
      this.showUploadPopup = false;
      this.selectedItem = null;
      this.tempDocuments = this.emptyDocuments();
      this.saveError = '';
    });
  }

  // "Confirm" — WMS marks the receiving VERIFIED and automatically submits it
  // for approval (see receiving.service.js confirmReceiving on the backend).
  acceptItem(item: ReceivingItem) {
    // Document upload is optional — staff can Confirm with or without
    // attaching delivery note / PO / etc., so only block on already-accepted.
    if (item.accepted) return;

    this.receivingService.confirm(item.receivingNumber).subscribe({
      next: () => {
        // Only flip this specific row's local state — no longer touching
        // poStatusService, which was keyed by PO number and would have
        // incorrectly marked every other line item on the same PO as
        // accepted too.
        item.accepted = true;
        alert(`✅ Confirmed — PO ${item.poNumber} submitted for approval.`);
        this.router.navigate(['/approval']);
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to confirm receiving');
      }
    });
  }
}