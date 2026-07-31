import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PoStatusService {

  // Holds the set of PO numbers that have been accepted in the Receive page.
  // BehaviorSubject so any component subscribing later still gets the current state.
  private acceptedPoNumbers = new BehaviorSubject<Set<string>>(new Set());

  getAcceptedPoNumbers(): Observable<Set<string>> {
    return this.acceptedPoNumbers.asObservable();
  }

  isAccepted(poNumber: string): boolean {
    return this.acceptedPoNumbers.value.has(poNumber);
  }

  markAccepted(poNumber: string): void {
    const updated = new Set(this.acceptedPoNumbers.value);
    updated.add(poNumber);
    this.acceptedPoNumbers.next(updated);
  }
}