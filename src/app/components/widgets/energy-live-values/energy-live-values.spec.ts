import { ComponentFixture, TestBed } from '@angular/core/testing'

import { EnergyLiveValuesWidget } from './energy-live-values'

describe('EnergyLiveValuesWidget', () => {
    let component: EnergyLiveValuesWidget
    let fixture: ComponentFixture<EnergyLiveValuesWidget>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnergyLiveValuesWidget],
        }).compileComponents()

        fixture = TestBed.createComponent(EnergyLiveValuesWidget)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
