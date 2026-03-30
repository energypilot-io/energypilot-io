import { ComponentFixture, TestBed } from '@angular/core/testing'

import { DeviceForm } from './device-form'

describe('DeviceForm', () => {
    let component: DeviceForm
    let fixture: ComponentFixture<DeviceForm>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DeviceForm],
        }).compileComponents()

        fixture = TestBed.createComponent(DeviceForm)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
