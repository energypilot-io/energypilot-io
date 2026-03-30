import { ComponentFixture, TestBed } from '@angular/core/testing'

import { EnergyKpis } from './energy-kpis'

describe('EnergyKpis', () => {
    let component: EnergyKpis
    let fixture: ComponentFixture<EnergyKpis>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnergyKpis],
        }).compileComponents()

        fixture = TestBed.createComponent(EnergyKpis)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
