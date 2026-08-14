import { Component, OnInit } from '@angular/core';
import { PoStatusService } from '../../services/po-status.service';

interface DocumentSet {
  deliveryNote: File | null;
  purchaseOrder: File | null;
  purchaseRequisition: File | null;
  materialRejectedReport: File | null;
}

interface ReceivingItem {
  poNumber: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  documentsUploaded: boolean;
  documents: DocumentSet;
  accepted: boolean;
}

@Component({
  selector: 'app-recieve',
  standalone: false,
  templateUrl: './recieve.component.html',
  styleUrl: './recieve.component.css'
})
export class RecieveComponent implements OnInit {

  receivingData: ReceivingItem[] = [
    {
      poNumber: '47243',
      description: 'KIT MAINTENANCE FOR GA55',
      orderedQty: 1,
      receivedQty: 1,
      documentsUploaded: false,
      documents: this.emptyDocuments(),
      accepted: false
    },
    {
      poNumber: '47226',
      description: 'Hydraulic Hose',
      orderedQty: 2,
      receivedQty: 2,
      documentsUploaded: false,
      documents: this.emptyDocuments(),
      accepted: false
    },
    {
      poNumber: '47230',
      description: 'Brake Pipe',
      orderedQty: 4,
      receivedQty: 4,
      documentsUploaded: false,
      documents: this.emptyDocuments(),
      accepted: false
    }
  ];

  searchTerm = '';

  showUploadPopup = false;
  selectedItem: ReceivingItem | null = null;

  get filteredData(): ReceivingItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.receivingData;
    }

    return this.receivingData.filter(item =>
      item.poNumber.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }

  constructor(private poStatusService: PoStatusService) {}

  ngOnInit(): void {
    // In case this page is revisited, restore accepted state from the shared service.
    this.receivingData.forEach(item => {
      item.accepted = this.poStatusService.isAccepted(item.poNumber);
    });
  }

  // working copy edited inside the modal, only committed on Save
  tempDocuments: DocumentSet = this.emptyDocuments();

  saveError = '';

  private emptyDocuments(): DocumentSet {
    return {
      deliveryNote: null,
      purchaseOrder: null,
      purchaseRequisition: null,
      materialRejectedReport: null
    };
  }

  openUploadPopup(item: ReceivingItem) {
    this.selectedItem = item;
    this.tempDocuments = { ...item.documents };
    this.saveError = '';
    this.showUploadPopup = true;
  }

  closeUploadPopup() {
    this.showUploadPopup = false;
    this.selectedItem = null;
    this.tempDocuments = this.emptyDocuments();
    this.saveError = '';
  }

  onFileSelected(event: Event, key: keyof DocumentSet) {
    const input = event.target as HTMLInputElement;
    this.tempDocuments[key] = input.files && input.files.length ? input.files[0] : null;
    this.saveError = '';
  }

  allFilesUploaded(): boolean {
    return Object.values(this.tempDocuments).every(file => file !== null);
  }

  saveDocuments() {
    if (!this.allFilesUploaded()) {
      this.saveError = 'Please upload all documents before saving.';
      return;
    }

    if (this.selectedItem) {
      this.selectedItem.documents = { ...this.tempDocuments };
      this.selectedItem.documentsUploaded = true;
    }

    this.showUploadPopup = false;
    this.selectedItem = null;
    this.tempDocuments = this.emptyDocuments();
    this.saveError = '';
  }

  acceptItem(item: ReceivingItem) {
    if (!item.documentsUploaded || item.accepted) {
      return;
    }

    item.accepted = true;
    this.poStatusService.markAccepted(item.poNumber);
    console.log('Accepted PO:', item.poNumber);
  }
}