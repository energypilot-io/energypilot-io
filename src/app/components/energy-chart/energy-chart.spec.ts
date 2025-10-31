import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyChart } from './energy-chart';

describe('EnergyChart', () => {
  let component: EnergyChart;
  let fixture: ComponentFixture<EnergyChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnergyChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
