import { ComponentFixture, TestBed } from '@angular/core/testing'

import { SolarForecastWidget } from './solar-forecast'

describe('SolarForecastWidget', () => {
    let component: SolarForecastWidget
    let fixture: ComponentFixture<SolarForecastWidget>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SolarForecastWidget],
        }).compileComponents()

        fixture = TestBed.createComponent(SolarForecastWidget)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
