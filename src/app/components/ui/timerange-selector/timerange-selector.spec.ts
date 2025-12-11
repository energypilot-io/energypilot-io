import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerangeSelector } from './timerange-selector';

describe('TimerangeSelector', () => {
  let component: TimerangeSelector;
  let fixture: ComponentFixture<TimerangeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerangeSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimerangeSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
