import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RscanComponent } from './rscan.component';

describe('RscanComponent', () => {
  let component: RscanComponent;
  let fixture: ComponentFixture<RscanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RscanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RscanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
