import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

export interface QrForPoDto {
  qrCode: string;
  poItemId: number | null;
  itemCode: string | null;
  itemName: string | null;
  location: string | null;
  receivedQtyPerBox: string | null;
  status: string;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class QrService {
  constructor(private http: HttpClient) {}

  // "Generate QR" — one QR per PO *line item*, not per PO, since a PO can
  // have several items and each needs its own trackable label. `location`
  // and `receivedQtyPerBox` are optional and persisted server-side
  // (qr_transactions.attribute_2 / attribute_3).
  generate(poNumber: string, poItemId: number, location?: string, receivedQtyPerBox?: string | null): Observable<{ success: boolean; data: { qrCode: string; poNumber: string; supplierName: string; poItemId: number; itemCode: string; itemName: string; orderedQty: number; location: string | null; receivedQtyPerBox: string | null } }> {
    return this.http.post<any>(AppSettings.API.qrTransactions, { poNumber, poItemId, location, receivedQtyPerBox });
  }

  get(qrCode: string): Observable<any> {
    return this.http.get<any>(`${AppSettings.API.qrTransactions}/${qrCode}`);
  }

  // "Recent QR Codes for this PO" — real, persisted, scoped to one PO.
  listForPo(poNumber: string): Observable<{ success: boolean; data: QrForPoDto[] }> {
    return this.http.get<any>(`${AppSettings.API_BASE_URL}/purchase-orders/${poNumber}/qr-codes`);
  }
}