import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyDistribution } from './energy-distribution';

describe('EnergyDistribution', () => {
  let component: EnergyDistribution;
  let fixture: ComponentFixture<EnergyDistribution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnergyDistribution]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyDistribution);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
