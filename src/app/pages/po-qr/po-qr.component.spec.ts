import { ComponentFixture, TestBed } from '@angular/core/testing';

import { POQRComponent } from './po-qr.component';

describe('POQRComponent', () => {
  let component: POQRComponent;
  let fixture: ComponentFixture<POQRComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [POQRComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(POQRComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
