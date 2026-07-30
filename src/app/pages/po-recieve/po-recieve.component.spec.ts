import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PORecieveComponent } from './po-recieve.component';

describe('PORecieveComponent', () => {
  let component: PORecieveComponent;
  let fixture: ComponentFixture<PORecieveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PORecieveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PORecieveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
