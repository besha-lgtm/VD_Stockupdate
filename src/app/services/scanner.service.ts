import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

@Injectable({ providedIn: 'root' })
export class ScannerService {
  constructor(private http: HttpClient) {}

  // "Scan QR" — validates the code against qr_transactions and logs the
  // attempt in scanner_transactions either way (success or failure).
  // Response now includes the specific line item this QR was generated for.
  scan(code: string): Observable<{
    success: boolean;
    data: {
      qrCode: string; poNumber: string; poId: number; status: string;
      supplierName: string; poItemId: number | null; itemCode: string | null;
      itemName: string | null; orderedQty: number | null;
    };
  }> {
    return this.http.post<any>(AppSettings.API.scan, { code });
  }
}
