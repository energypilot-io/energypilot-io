import { ComponentFixture, TestBed } from '@angular/core/testing'

import { DevicesComponent } from './devices'

describe('Devices', () => {
    let component: DevicesComponent
    let fixture: ComponentFixture<DevicesComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DevicesComponent],
        }).compileComponents()

        fixture = TestBed.createComponent(DevicesComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
