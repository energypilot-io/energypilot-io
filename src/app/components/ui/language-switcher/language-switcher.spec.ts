import { ComponentFixture, TestBed } from '@angular/core/testing'

import { LanguageSwitcher } from './language-switcher'

describe('LanguageSwitcher', () => {
    let component: LanguageSwitcher
    let fixture: ComponentFixture<LanguageSwitcher>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LanguageSwitcher],
        }).compileComponents()

        fixture = TestBed.createComponent(LanguageSwitcher)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
