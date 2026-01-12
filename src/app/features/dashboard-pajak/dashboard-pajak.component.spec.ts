import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPajakComponent } from './dashboard-pajak.component';

describe('DashboardPajakComponent', () => {
  let component: DashboardPajakComponent;
  let fixture: ComponentFixture<DashboardPajakComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardPajakComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardPajakComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
