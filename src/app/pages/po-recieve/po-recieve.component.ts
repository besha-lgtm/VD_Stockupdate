import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReceivingService, ReceivingDto, ReceivingItemDto } from '../../services/receiving.service';

interface ApprovalEdit {
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string;
}

// A single status that folds approvalStatus + qcStatus into one value the
// UI can filter and badge on, instead of juggling two fields everywhere.
type RowStatus = 'PENDING_APPROVAL' | 'QC_PENDING' | 'PUSH_FAILED' | 'QC_APPROVED' | 'QC_REJECTED' | 'REJECTED' | 'OTHER';

interface StatusTab {
  key: RowStatus | 'ALL';
  label: string;
}

@Component({
  selector: 'app-po-recieve',
  standalone: false,
  templateUrl: './po-recieve.component.html',
  styleUrl: './po-recieve.component.css'
})
export class PORecieveComponent implements OnInit {

  all: ReceivingDto[] = [];
  loading = false;
  loadError = '';
  searchTerm = '';
  currentDate: Date = new Date();

  activeTab: RowStatus | 'ALL' = 'ALL';
  expandedReceivingNumber: string | null = null;

  edits: Record<number, ApprovalEdit> = {};
  actingOn: string | null = null;
  retryingOn: string | null = null;
  reopeningOn: string | null = null;

  readonly tabs: StatusTab[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING_APPROVAL', label: 'Awaiting decision' },
    { key: 'QC_PENDING', label: 'Pending in QC' },
    { key: 'QC_APPROVED', label: 'QC approved' },
    { key: 'QC_REJECTED', label: 'QC rejected' },
    { key: 'REJECTED', label: 'Rejected' }
  ];

  constructor(
    private receivingService: ReceivingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReceivings();
  }

  // ===================== Status derivation =====================

  // Folds approvalStatus + qcStatus into one status for filtering/badging.
  // A failed ERP push is surfaced under "Pending in QC" (it hasn't reached
  // QC yet) but keeps its own distinct badge + retry action on the row.
  rowStatus(r: ReceivingDto): RowStatus {
    if (r.status === 'REJECTED') return 'REJECTED';
    if (r.approvalStatus === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
    if (r.approvalStatus === 'APPROVED') {
      if (r.qcStatus === 'PASSED') return 'QC_APPROVED';
      if (r.qcStatus === 'FAILED') return 'QC_REJECTED';
      if (r.qcStatus === 'PUSH_FAILED') return 'PUSH_FAILED';
      return 'QC_PENDING';
    }
    return 'OTHER';
  }

  private tabMatches(status: RowStatus, tab: RowStatus | 'ALL'): boolean {
    if (tab === 'ALL') return true;
    if (tab === 'QC_PENDING') return status === 'QC_PENDING' || status === 'PUSH_FAILED';
    return status === tab;
  }

  statusMeta(status: RowStatus): { label: string; cls: string; icon: string } {
    switch (status) {
      case 'PENDING_APPROVAL': return { label: 'Awaiting decision', cls: 'amber', icon: 'pi-clock' };
      case 'QC_PENDING': return { label: 'Pending in QC', cls: 'blue', icon: 'pi-hourglass' };
      case 'PUSH_FAILED': return { label: 'ERP push failed', cls: 'orange', icon: 'pi-exclamation-triangle' };
      case 'QC_APPROVED': return { label: 'QC approved', cls: 'green', icon: 'pi-check-circle' };
      case 'QC_REJECTED': return { label: 'QC rejected', cls: 'red', icon: 'pi-times-circle' };
      case 'REJECTED': return { label: 'Rejected', cls: 'red', icon: 'pi-times-circle' };
      default: return { label: 'Not submitted', cls: 'gray', icon: 'pi-minus-circle' };
    }
  }

  // ===================== Filtering =====================

  get filteredRows(): ReceivingDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.all.filter(r => {
      if (!this.tabMatches(this.rowStatus(r), this.activeTab)) return false;
      if (!term) return true;
      return r.poNumber.toLowerCase().includes(term) ||
        r.receivingNumber.toLowerCase().includes(term) ||
        (r.supplierName || '').toLowerCase().includes(term);
    });
  }

  countFor(tab: RowStatus | 'ALL'): number {
    return this.all.filter(r => this.tabMatches(this.rowStatus(r), tab)).length;
  }

  setTab(tab: RowStatus | 'ALL'): void {
    this.activeTab = tab;
    this.expandedReceivingNumber = null;
  }

  // ===================== Load =====================

  loadReceivings(): void {
    this.loading = true;
    this.loadError = '';
    this.receivingService.list().subscribe({
      next: (res) => {
        this.all = res.data || [];
        this.edits = {};
        for (const r of this.all) {
          for (const item of r.items) {
            this.edits[item.receivingItemId] = {
              acceptedQty: item.receivedQty,
              rejectedQty: 0,
              rejectionReason: ''
            };
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load receiving records';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.currentDate = new Date();
    this.loadReceivings();
  }

  // ===================== Row expansion =====================

  toggleRow(r: ReceivingDto): void {
    this.expandedReceivingNumber = this.expandedReceivingNumber === r.receivingNumber ? null : r.receivingNumber;
  }

  isExpanded(r: ReceivingDto): boolean {
    return this.expandedReceivingNumber === r.receivingNumber;
  }

  // ===================== Detail panel helpers =====================

  // The panel only renders the trace strip when there is something to trace.
  hasMeta(r: ReceivingDto): boolean {
    return !!(r.approvedBy || r.approvedByName || r.approvedAt || r.visipackReceiptNo || r.visipackGrnNo || r.remarks);
  }

  // approvedBy holds a raw user id (attribute_2). Prefer the resolved name
  // the backend now returns; fall back to a labelled id so the panel never
  // shows a bare number.
  approverName(r: ReceivingDto): string {
    if (r.approvedByName) return r.approvedByName;
    if (r.approvedBy) return `User #${r.approvedBy}`;
    return '—';
  }

  approverInitial(r: ReceivingDto): string {
    const name = this.approverName(r);
    return /^[A-Za-z]/.test(name) ? name.charAt(0).toUpperCase() : '#';
  }

  // ===================== Quantity editing =====================

  // Typing an accepted qty implies the rest of the line was rejected.
  onAcceptedChange(item: ReceivingItemDto): void {
    const edit = this.edits[item.receivingItemId];
    if (!edit) return;
    const accepted = Math.min(Math.max(Number(edit.acceptedQty) || 0, 0), item.receivedQty);
    edit.acceptedQty = accepted;
    edit.rejectedQty = item.receivedQty - accepted;
    if (!edit.rejectedQty) edit.rejectionReason = '';
  }

  acceptAll(r: ReceivingDto): void {
    for (const item of r.items) {
      const edit = this.edits[item.receivingItemId];
      if (!edit) continue;
      edit.acceptedQty = item.receivedQty;
      edit.rejectedQty = 0;
      edit.rejectionReason = '';
    }
  }

  itemBalanced(item: ReceivingItemDto): boolean {
    const edit = this.edits[item.receivingItemId];
    if (!edit) return true;
    return (Number(edit.acceptedQty) || 0) + (Number(edit.rejectedQty) || 0) === Number(item.receivedQty);
  }

  rowBalanced(r: ReceivingDto): boolean {
    return r.items.every(i => this.itemBalanced(i));
  }

  editedAcceptedTotal(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(this.edits[i.receivingItemId]?.acceptedQty) || 0), 0);
  }

  editedRejectedTotal(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(this.edits[i.receivingItemId]?.rejectedQty) || 0), 0);
  }

  // ===================== Approve / Reject decision =====================
  // On APPROVE, the WMS backend automatically pushes to VISIPACK (Step 5) as
  // a pre-QC "Incoming Receipt". No GRN exists yet — VISIPACK only mints a
  // real GRN once its own QC Incoming Approval accepts the material.
  decide(r: ReceivingDto, decision: 'APPROVED' | 'REJECTED'): void {
    const itemDecisions = r.items.map(item => ({
      receivingItemId: item.receivingItemId,
      acceptedQty: decision === 'APPROVED' ? (this.edits[item.receivingItemId]?.acceptedQty ?? item.receivedQty) : 0,
      rejectedQty: decision === 'APPROVED' ? (this.edits[item.receivingItemId]?.rejectedQty ?? 0) : item.receivedQty,
      rejectionReason: this.edits[item.receivingItemId]?.rejectionReason || undefined
    }));

    this.actingOn = r.receivingNumber;
    this.receivingService.decideApproval(r.receivingNumber, decision, itemDecisions).subscribe({
      next: () => {
        this.actingOn = null;
        this.expandedReceivingNumber = null;
        alert(
          decision === 'APPROVED'
            ? `${r.receivingNumber} approved and pushed to VISIPACK as an incoming receipt for QC.`
            : `${r.receivingNumber} rejected.`
        );
        this.loadReceivings();
      },
      error: (err) => {
        this.actingOn = null;
        alert(err?.error?.message || `Failed to ${decision === 'APPROVED' ? 'approve' : 'reject'}`);
      }
    });
  }

  // ===================== Retry a failed VISIPACK push =====================

  retryPush(r: ReceivingDto): void {
    this.retryingOn = r.receivingNumber;
    this.receivingService.retryPush(r.receivingNumber).subscribe({
      next: () => {
        this.retryingOn = null;
        alert(`${r.receivingNumber} pushed to VISIPACK successfully.`);
        this.loadReceivings();
      },
      error: (err) => {
        this.retryingOn = null;
        alert(err?.error?.message || 'Retry failed — VISIPACK may still be unreachable. Try again shortly.');
        this.loadReceivings();
      }
    });
  }

  // ===================== Reopen a rejected receiving =====================

  reopenForCorrection(r: ReceivingDto): void {
    this.reopeningOn = r.receivingNumber;
    this.receivingService.reopenRejected(r.receivingNumber).subscribe({
      next: () => {
        this.reopeningOn = null;
        this.loadReceivings();
        this.router.navigate(['/recieve']);
      },
      error: (err) => {
        this.reopeningOn = null;
        alert(err?.error?.message || 'Failed to reopen this receiving.');
      }
    });
  }

  // ===================== Display helpers =====================

  totalOrderedQty(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(i.orderedQty) || 0), 0);
  }

  totalReceivedQty(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(i.receivedQty) || 0), 0);
  }

  totalAcceptedQty(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(i.acceptedQty) || 0), 0);
  }

  totalRejectedQty(r: ReceivingDto): number {
    return r.items.reduce((sum, i) => sum + (Number(i.rejectedQty) || 0), 0);
  }

  itemSummary(r: ReceivingDto): string {
    if (!r.items.length) return '—';
    if (r.items.length === 1) return r.items[0].itemName || r.items[0].itemCode;
    return `${r.items[0].itemName || r.items[0].itemCode} +${r.items.length - 1} more`;
  }

  getFormattedDate(date: string | Date | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}