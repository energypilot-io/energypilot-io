import { ComponentFixture, TestBed } from '@angular/core/testing'

import { SolarForecast } from './solar-forecast'

describe('SolarForecast', () => {
    let component: SolarForecast
    let fixture: ComponentFixture<SolarForecast>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SolarForecast],
        }).compileComponents()

        fixture = TestBed.createComponent(SolarForecast)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
