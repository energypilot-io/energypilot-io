import { ComponentFixture, TestBed } from '@angular/core/testing'

import { KpiComponent } from './kpi'

describe('Kpi', () => {
    let component: KpiComponent
    let fixture: ComponentFixture<KpiComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [KpiComponent],
        }).compileComponents()

        fixture = TestBed.createComponent(KpiComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
