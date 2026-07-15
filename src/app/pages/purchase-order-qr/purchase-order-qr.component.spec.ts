import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { PurchaseOrderQrComponent } from './purchase-order-qr.component';

describe('PurchaseOrderQrComponent', () => {
  let component: PurchaseOrderQrComponent;
  let fixture: ComponentFixture<PurchaseOrderQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseOrderQrComponent],
      imports: [FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
