import { ComponentFixture, TestBed } from '@angular/core/testing'

import { DeviceInfoCard } from './device-info-card'

describe('DeviceInfoCard', () => {
    let component: DeviceInfoCard
    let fixture: ComponentFixture<DeviceInfoCard>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DeviceInfoCard],
        }).compileComponents()

        fixture = TestBed.createComponent(DeviceInfoCard)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
