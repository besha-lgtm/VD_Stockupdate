import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../app.settings';

export interface DashboardStat {
  title: string;
  value: string;
  sub1: string;
  sub2: string;
  colorClass: string;
}

export interface RecentTransaction {
  time: string;
  type: string;
  reference: string;
  item: string;
  qty: number | string;
  status: string;
}

export interface AttentionItem {
  type: string;
  title: string;
  desc: string;
  time: string;
}

export interface DashboardSummary {
  stats: DashboardStat[];
  recentTransactions: RecentTransaction[];
  attentionRequired: AttentionItem[];
}

export interface SystemStatus {
  erpConnected: boolean;
  lastSyncAt: string | null;
  notificationsCount: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getSummary(): Observable<{ success: boolean; data: DashboardSummary }> {
    return this.http.get<any>(AppSettings.API.dashboardSummary);
  }

  getSystemStatus(): Observable<{ success: boolean; data: SystemStatus }> {
    return this.http.get<any>(AppSettings.API.dashboardSystemStatus);
  }
}