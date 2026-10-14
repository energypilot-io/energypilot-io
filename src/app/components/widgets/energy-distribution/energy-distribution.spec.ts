import { ComponentFixture, TestBed } from '@angular/core/testing'

import { EnergyDistributionWidget } from './energy-distribution'

describe('EnergyDistributionWidget', () => {
    let component: EnergyDistributionWidget
    let fixture: ComponentFixture<EnergyDistributionWidget>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EnergyDistributionWidget],
        }).compileComponents()

        fixture = TestBed.createComponent(EnergyDistributionWidget)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
