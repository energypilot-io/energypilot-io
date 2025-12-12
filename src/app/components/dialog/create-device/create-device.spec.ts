import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDevice } from './create-device';

describe('CreateDevice', () => {
  let component: CreateDevice;
  let fixture: ComponentFixture<CreateDevice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDevice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDevice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
