export class AppSettings {
  public static readonly API_BASE_URL = 'http://localhost:3001/api';

  public static API = {
    login: AppSettings.API_BASE_URL + '/auth/login',

    // Supplier PO (synced from VISIPACK, Steps 1-3)
    syncSupplierPos: AppSettings.API_BASE_URL + '/integration/sync-supplier-pos',
    purchaseOrders: AppSettings.API_BASE_URL + '/purchase-orders',

    // Dashboard — live stats, recent transactions & attention required
    dashboardSummary: AppSettings.API_BASE_URL + '/dashboard/summary',
    dashboardSystemStatus: AppSettings.API_BASE_URL + '/dashboard/system-status',
    dashboardHubSummary: AppSettings.API_BASE_URL + '/dashboard/hub-summary',

    // Generate QR
    qrTransactions: AppSettings.API_BASE_URL + '/qr-transactions',

    // Scan QR
    scan: AppSettings.API_BASE_URL + '/scanner/scan',

    // Receiving Verification / Documents / Confirm / Approval
    receivingVerifications: AppSettings.API_BASE_URL + '/receiving-verifications',

    // Issue Items / Issue Verification
    departments: AppSettings.API_BASE_URL + '/departments',
    items: AppSettings.API_BASE_URL + '/items',
    issueRequests: AppSettings.API_BASE_URL + '/issue-requests'
  };
}