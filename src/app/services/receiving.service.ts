import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

export interface ReceivingItemDto {
  receivingItemId: number;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string | null;
}

export interface ReceivingDto {
  receivingId: number;
  receivingNumber: string;
  poId: number;
  poNumber: string;
  supplierName: string;
  status: string; // PENDING | IN_PROGRESS | VERIFIED | REJECTED | CANCELLED
  approvalStatus: string; // NOT_SUBMITTED | PENDING_APPROVAL | APPROVED | REJECTED
  approvedBy: string | null;
  approvedAt: string | null;
  visipackGrnNo: string | null;
  qcStatus: string | null; // PENDING | PASSED | FAILED
  remarks: string | null;
  items: ReceivingItemDto[];
  documents: { documentId: number; documentType: string; documentName: string; documentUrl: string }[];
}

@Injectable({ providedIn: 'root' })
export class ReceivingService {
  constructor(private http: HttpClient) {}

  list(): Observable<{ success: boolean; data: ReceivingDto[] }> {
    return this.http.get<any>(AppSettings.API.receivingVerifications);
  }

  get(receivingNumber: string): Observable<{ success: boolean; data: ReceivingDto }> {
    return this.http.get<any>(`${AppSettings.API.receivingVerifications}/${receivingNumber}`);
  }

  // "Receiving Verification update" — items: [{ poItemId, receivedQty }]
  create(payload: { qrCode: string; items: { poItemId: number; receivedQty: number }[]; remarks?: string }): Observable<{ success: boolean; data: ReceivingDto }> {
    return this.http.post<any>(AppSettings.API.receivingVerifications, payload);
  }

  // "Bills and documents upload" — real multipart file upload
  uploadDocument(receivingNumber: string, documentType: string, file: File): Observable<any> {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('documentName', file.name);
    form.append('file', file);
    return this.http.post<any>(`${AppSettings.API.receivingVerifications}/${receivingNumber}/documents`, form);
  }

  // "Confirm"
  confirm(receivingNumber: string): Observable<{ success: boolean; data: ReceivingDto }> {
    return this.http.put<any>(`${AppSettings.API.receivingVerifications}/${receivingNumber}/confirm`, {});
  }

  // "Approval Request" decision — also triggers Step 5 (push to VISIPACK) on the backend when APPROVED
  decideApproval(
    receivingNumber: string,
    decision: 'APPROVED' | 'REJECTED',
    itemDecisions: { receivingItemId: number; acceptedQty: number; rejectedQty: number; rejectionReason?: string }[]
  ): Observable<{ success: boolean; data: ReceivingDto }> {
    return this.http.put<any>(`${AppSettings.API.receivingVerifications}/${receivingNumber}/approval`, { decision, itemDecisions });
  }
}
