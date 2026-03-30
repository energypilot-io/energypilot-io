import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ThemeSwitcher } from './theme-switcher'

describe('ThemeSwitcher', () => {
    let component: ThemeSwitcher
    let fixture: ComponentFixture<ThemeSwitcher>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ThemeSwitcher],
        }).compileComponents()

        fixture = TestBed.createComponent(ThemeSwitcher)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
