import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

export interface PurchaseOrderItemDto {
  poItemId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  uomCode: string;
  orderedQty: number;
  receivedQty: number;
}

export interface PurchaseOrderDto {
  poId: number;
  poNumber: string;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  poDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  sourceSystem: string | null;
  items: PurchaseOrderItemDto[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  constructor(private http: HttpClient) {}

  // Step 1-3: pull Approved Supplier POs from VISIPACK into WMS.
  // Call this when the PO screen opens so the list below is fresh.
  syncFromVisipack(): Observable<any> {
    return this.http.post<any>(AppSettings.API.syncSupplierPos, {});
  }

  list(): Observable<{ success: boolean; data: PurchaseOrderDto[] }> {
    return this.http.get<any>(AppSettings.API.purchaseOrders);
  }

  get(poNumber: string): Observable<{ success: boolean; data: PurchaseOrderDto }> {
    return this.http.get<any>(`${AppSettings.API.purchaseOrders}/${poNumber}`);
  }
}
