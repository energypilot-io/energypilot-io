import { ComponentFixture, TestBed } from '@angular/core/testing'

import { EnergyLiveValues } from './energy-live-values'

describe('EnergyLiveValues', () => {
    let component: EnergyLiveValues
    let fixture: ComponentFixture<EnergyLiveValues>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnergyLiveValues],
        }).compileComponents()

        fixture = TestBed.createComponent(EnergyLiveValues)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
