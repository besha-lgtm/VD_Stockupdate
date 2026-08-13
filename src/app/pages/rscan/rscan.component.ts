import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

// Interface must be declared before the component
interface POItem {
  id: number;
  poNumber: string;
  supplierName: string;
  description: string;
  boxNumber: string;
  serialNumber: string;
  quantity: number;
}

@Component({
  selector: 'app-rscan',
  standalone: false,
  templateUrl: './rscan.component.html',
  styleUrl: './rscan.component.css'
})
export class RscanComponent implements OnInit, OnDestroy {
  scannerEnabled = true;
  scanResult: string | null = null;
  scannedPO: POItem | null = null;
  showReceipt = false;
  isLoading = false;
  errorMessage: string | null = null;

  // Mock data for demonstration - In real app, this would come from an API
  private mockPOData: POItem[] = [
    {
      id: 1,
      poNumber: '47243',
      supplierName: 'ABC Supplies',
      description: 'KIT MAINTENANCE',
      boxNumber: 'BOX-001',
      serialNumber: 'SN001',
      quantity: 100
    },
    {
      id: 2,
      poNumber: '47244',
      supplierName: 'ABC Supplies',
      description: 'VALVE',
      boxNumber: 'BOX-002',
      serialNumber: 'SN002',
      quantity: 50
    },
    {
      id: 3,
      poNumber: '47245',
      supplierName: 'XYZ Traders',
      description: 'COOLER',
      boxNumber: 'BOX-003',
      serialNumber: 'SN003',
      quantity: 75
    },
    {
      id: 4,
      poNumber: '47246',
      supplierName: 'XYZ Traders',
      description: 'MAINTENANCE KIT',
      boxNumber: 'BOX-004',
      serialNumber: 'SN004',
      quantity: 30
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize scanner
    this.scannerEnabled = true;
  }

  ngOnDestroy(): void {
    // Clean up scanner
    this.scannerEnabled = false;
  }

  onScanSuccess(result: string): void {
    if (!this.scannerEnabled) return;
    
    this.scannerEnabled = false;
    this.isLoading = true;
    this.errorMessage = null;
    this.scanResult = result;

    // Parse the scanned QR code
    try {
      // Try to parse as JSON
      const parsedData = JSON.parse(result);
      
      // Find the PO in mock data
      const foundPO = this.mockPOData.find(
        po => po.poNumber === parsedData.poNumber
      );

      if (foundPO) {
        this.scannedPO = foundPO;
        this.showReceipt = true;
        this.isLoading = false;
      } else {
        this.errorMessage = 'PO not found in system';
        this.isLoading = false;
        // Re-enable scanner after error
        setTimeout(() => {
          this.scannerEnabled = true;
        }, 2000);
      }
    } catch (error) {
      // If not JSON, try to search by PO number directly
      const foundPO = this.mockPOData.find(
        po => po.poNumber === result.trim()
      );

      if (foundPO) {
        this.scannedPO = foundPO;
        this.showReceipt = true;
        this.isLoading = false;
      } else {
        this.errorMessage = 'Invalid QR code or PO not found';
        this.isLoading = false;
        setTimeout(() => {
          this.scannerEnabled = true;
        }, 2000);
      }
    }
  }

  onScanError(error: any): void {
    console.error('Scan error:', error);
    this.errorMessage = 'Failed to scan. Please try again.';
    setTimeout(() => {
      this.errorMessage = null;
    }, 3000);
  }

  acceptPO(): void {
    if (!this.scannedPO) return;
    
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      alert(`✅ PO ${this.scannedPO?.poNumber} has been ACCEPTED successfully!`);
      this.isLoading = false;
      this.resetScanner();
    }, 1500);
  }

  verifyPO(): void {
    if (!this.scannedPO) return;
    
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      alert(`🔍 PO ${this.scannedPO?.poNumber} has been VERIFIED successfully!`);
      this.isLoading = false;
      this.resetScanner();
    }, 1500);
  }

  resetScanner(): void {
    this.scanResult = null;
    this.scannedPO = null;
    this.showReceipt = false;
    this.errorMessage = null;
    this.isLoading = false;
    this.scannerEnabled = true;
  }

  goBack(): void {
    this.router.navigate(['/main-menu']);
  }

  rescan(): void {
    this.resetScanner();
  }
}