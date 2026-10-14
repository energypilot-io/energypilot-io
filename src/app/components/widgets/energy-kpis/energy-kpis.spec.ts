import { ComponentFixture, TestBed } from '@angular/core/testing'

import { EnergyKpisWidget } from './energy-kpis'

describe('EnergyKpisWidget', () => {
    let component: EnergyKpisWidget
    let fixture: ComponentFixture<EnergyKpisWidget>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnergyKpisWidget],
        }).compileComponents()

        fixture = TestBed.createComponent(EnergyKpisWidget)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
