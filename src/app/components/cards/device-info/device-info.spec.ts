import { ComponentFixture, TestBed } from '@angular/core/testing'

import { DeviceInfoComponent } from './device-info'

describe('DeviceInfo', () => {
    let component: DeviceInfoComponent
    let fixture: ComponentFixture<DeviceInfoComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DeviceInfoComponent],
        }).compileComponents()

        fixture = TestBed.createComponent(DeviceInfoComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
