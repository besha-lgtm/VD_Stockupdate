import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

@Injectable({ providedIn: 'root' })
export class QrService {
  constructor(private http: HttpClient) {}

  // "Generate QR" — one QR per PO *line item*, not per PO, since a PO can
  // have several items and each needs its own trackable label.
  generate(poNumber: string, poItemId: number): Observable<{ success: boolean; data: { qrCode: string; poNumber: string; supplierName: string; poItemId: number; itemCode: string; itemName: string; orderedQty: number } }> {
    return this.http.post<any>(AppSettings.API.qrTransactions, { poNumber, poItemId });
  }

  get(qrCode: string): Observable<any> {
    return this.http.get<any>(`${AppSettings.API.qrTransactions}/${qrCode}`);
  }
}
