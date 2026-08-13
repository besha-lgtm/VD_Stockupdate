import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IscanComponent } from './iscan.component';

describe('IscanComponent', () => {
  let component: IscanComponent;
  let fixture: ComponentFixture<IscanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IscanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IscanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
