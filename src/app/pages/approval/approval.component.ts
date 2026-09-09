import { Component, OnInit } from '@angular/core';
import { ReceivingService, ReceivingDto } from '../../services/receiving.service';

@Component({
  selector: 'app-approval',
  standalone: false,
  templateUrl: './approval.component.html',
  styleUrl: './approval.component.css'
})
export class ApprovalComponent implements OnInit {

  pending: ReceivingDto[] = [];
  loading = false;
  loadError = '';
  actingOn: string | null = null; // receivingNumber currently being approved/rejected

  // acceptedQty/rejectedQty/rejectionReason entered by the approver, keyed by receivingItemId
  edits: Record<number, { acceptedQty: number; rejectedQty: number; rejectionReason: string }> = {};

  constructor(private receivingService: ReceivingService) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.receivingService.list().subscribe({
      next: (res) => {
        this.pending = (res.data || []).filter(r => r.approvalStatus === 'PENDING_APPROVAL');
        this.edits = {};
        for (const r of this.pending) {
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
        this.loadError = err?.error?.message || 'Failed to load pending approvals';
        this.loading = false;
      }
    });
  }

  // "Approval Request" decision — on APPROVE, the WMS backend automatically
  // pushes to VISIPACK (Step 5) as a pre-QC "Incoming Receipt". No GRN exists
  // yet at this point — VISIPACK only mints a real GRN once its own QC
  // Incoming Approval accepts the material.
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
        alert(
          decision === 'APPROVED'
            ? `✅ ${r.receivingNumber} approved and pushed to VISIPACK as an incoming receipt for QC. A GRN will be issued once QC Incoming Approval accepts it.`
            : `❌ ${r.receivingNumber} rejected.`
        );
        this.load();
      },
      error: (err) => {
        this.actingOn = null;
        alert(err?.error?.message || `Failed to ${decision === 'APPROVED' ? 'approve' : 'reject'}`);
      }
    });
  }
}
