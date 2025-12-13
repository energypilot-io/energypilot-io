import { ComponentFixture, TestBed } from '@angular/core/testing'

import { CreateDeviceComponent } from './create-device'

describe('CreateDevice', () => {
    let component: CreateDeviceComponent
    let fixture: ComponentFixture<CreateDeviceComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreateDeviceComponent],
        }).compileComponents()

        fixture = TestBed.createComponent(CreateDeviceComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
