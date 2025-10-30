import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Devices } from './devices';

describe('Devices', () => {
  let component: Devices;
  let fixture: ComponentFixture<Devices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Devices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Devices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
