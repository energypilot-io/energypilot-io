import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ThemePickerComponent } from './theme-picker'

describe('ThemePicker', () => {
    let component: ThemePickerComponent
    let fixture: ComponentFixture<ThemePickerComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ThemePickerComponent],
        }).compileComponents()

        fixture = TestBed.createComponent(ThemePickerComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
