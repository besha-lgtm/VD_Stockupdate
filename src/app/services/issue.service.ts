import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

export interface DepartmentDto {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
}

export interface ItemWithStockDto {
  itemId: number;
  itemCode: string;
  itemName: string;
  uomCode: string;
  stockQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface IssueRequestItemDto {
  issueRequestItemId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  uomCode: string;
  requestedQty: number;
  approvedQty: number;
  issuedQty: number;
  availableQty: number;
}

export interface IssueRequestDto {
  issueRequestId: number;
  issueRequestNumber: string;
  departmentId: number;
  departmentName: string;
  requestDate: string;
  status: string; // DRAFT | SUBMITTED | APPROVED | PARTIALLY_ISSUED | ISSUED | REJECTED | CANCELLED | CLOSED
  approvalStatus: string; // NOT_SUBMITTED | PENDING_APPROVAL | APPROVED | REJECTED
  approvedBy: string | null;
  approvedAt: string | null;
  remarks: string | null;
  items: IssueRequestItemDto[];
}

@Injectable({ providedIn: 'root' })
export class IssueService {
  constructor(private http: HttpClient) {}

  listDepartments(): Observable<{ success: boolean; data: DepartmentDto[] }> {
    return this.http.get<any>(AppSettings.API.departments);
  }

  listItems(): Observable<{ success: boolean; data: ItemWithStockDto[] }> {
    return this.http.get<any>(AppSettings.API.items);
  }

  list(): Observable<{ success: boolean; data: IssueRequestDto[] }> {
    return this.http.get<any>(AppSettings.API.issueRequests);
  }

  get(issueRequestNumber: string): Observable<{ success: boolean; data: IssueRequestDto }> {
    return this.http.get<any>(`${AppSettings.API.issueRequests}/${issueRequestNumber}`);
  }

  // "Issue Request" (Step 1) — department + one or more items with the qty needed.
  create(payload: { departmentId: number; items: { itemId: number; requestedQty: number }[]; remarks?: string }): Observable<{ success: boolean; data: IssueRequestDto }> {
    return this.http.post<any>(AppSettings.API.issueRequests, payload);
  }

  // "Confirm" — locks in the request and sends it for supervisor approval
  // (Issue Verification) instead of touching stock immediately.
  confirm(issueRequestNumber: string): Observable<{ success: boolean; data: IssueRequestDto }> {
    return this.http.put<any>(`${AppSettings.API.issueRequests}/${issueRequestNumber}/confirm`, {});
  }

  // "Issue Verification" decision — Approve (decrements real stock on the
  // backend) or Reject. Mirrors ReceivingService.decideApproval().
  decideApproval(
    issueRequestNumber: string,
    decision: 'APPROVED' | 'REJECTED',
    itemDecisions: { issueRequestItemId: number; issuedQty: number }[],
    rejectionReason?: string
  ): Observable<{ success: boolean; data: IssueRequestDto }> {
    return this.http.put<any>(`${AppSettings.API.issueRequests}/${issueRequestNumber}/approval`, { decision, itemDecisions, rejectionReason });
  }
}
