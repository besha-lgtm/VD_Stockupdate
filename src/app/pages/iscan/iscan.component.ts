import { Component,OnInit, OnDestroy  } from '@angular/core';
import { Router } from '@angular/router';

interface IssueItem {
  id: number;
  requestNumber: string;
  department: string;
  item: string;
  required: number;
  status: string;
}

@Component({
  selector: 'app-iscan',
  standalone: false,
  templateUrl: './iscan.component.html',
  styleUrl: './iscan.component.css'
})

export class IscanComponent implements OnInit, OnDestroy {
  scannerEnabled = true;
  scanResult: string | null = null;
  scannedItem: IssueItem | null = null;
  showDetails = false;
  isLoading = false;
  errorMessage: string | null = null;

  // Mock data for demonstration - In real app, this would come from an API
  private mockIssueData: IssueItem[] = [
    {
      id: 1,
      requestNumber: 'REQ-001',
      department: 'Production',
      item: 'KIT MAINTENANCE FOR GA55',
      required: 1,
      status: 'ISSUED'
    },
    {
      id: 2,
      requestNumber: 'REQ-002',
      department: 'Maintenance',
      item: 'Hydraulic Hose',
      required: 2,
      status: 'ISSUED'
    },
    {
      id: 3,
      requestNumber: 'REQ-003',
      department: 'Quality',
      item: 'Brake Pipe',
      required: 4,
      status: 'ISSUED'
    },
    {
      id: 4,
      requestNumber: 'REQ-004',
      department: 'Production',
      item: 'Cooler Unit',
      required: 3,
      status: 'ISSUED'
    },
    {
      id: 5,
      requestNumber: 'REQ-005',
      department: 'Maintenance',
      item: 'Valve Assembly',
      required: 5,
      status: 'ISSUED'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.scannerEnabled = true;
  }

  ngOnDestroy(): void {
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
      
      // Find the item in mock data
      const foundItem = this.mockIssueData.find(
        item => item.requestNumber === parsedData.requestNumber ||
                item.item === parsedData.item
      );

      if (foundItem) {
        this.scannedItem = foundItem;
        this.showDetails = true;
        this.isLoading = false;
      } else {
        this.errorMessage = 'Issue request not found in system';
        this.isLoading = false;
        setTimeout(() => {
          this.scannerEnabled = true;
        }, 2000);
      }
    } catch (error) {
      // If not JSON, try to search by request number directly
      const foundItem = this.mockIssueData.find(
        item => item.requestNumber === result.trim() ||
                item.item.toLowerCase().includes(result.trim().toLowerCase())
      );

      if (foundItem) {
        this.scannedItem = foundItem;
        this.showDetails = true;
        this.isLoading = false;
      } else {
        this.errorMessage = 'Invalid QR code or request not found';
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

  acceptIssue(): void {
    if (!this.scannedItem) return;
    
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      alert(`✅ Issue request ${this.scannedItem?.requestNumber} has been ACCEPTED successfully!\n\nItem: ${this.scannedItem?.item}\nQuantity: ${this.scannedItem?.required}\nDepartment: ${this.scannedItem?.department}`);
      this.isLoading = false;
      this.resetScanner();
    }, 1500);
  }

  resetScanner(): void {
    this.scanResult = null;
    this.scannedItem = null;
    this.showDetails = false;
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