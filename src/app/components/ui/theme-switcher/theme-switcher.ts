import { Component, signal } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { tablerSun, tablerSunMoon, tablerMoon } from '@ng-icons/tabler-icons'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import {
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
} from '@ng-bootstrap/ng-bootstrap/dropdown'

@Component({
    selector: 'app-theme-switcher',
    imports: [
        NgbModule,
        NgIcon,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
    ],
    templateUrl: './theme-switcher.html',
    styleUrl: './theme-switcher.scss',
    providers: [provideIcons({ tablerSun, tablerSunMoon, tablerMoon })],
})
export class ThemeSwitcher {
    static storageKey = 'energypilot-theme'

    theme = signal<'light' | 'dark' | 'auto'>('auto')

    ngOnInit(): void {
        this.storeTheme(this.getStoredTheme())
    }

    storeTheme(theme: 'light' | 'dark' | 'auto') {
        this.theme.set(theme)

        document.documentElement.setAttribute('data-bs-theme', this.theme())

        try {
            window.localStorage[ThemeSwitcher.storageKey] = this.theme()
        } catch {}
    }

    getStoredTheme(): 'light' | 'dark' | 'auto' {
        try {
            return window.localStorage[ThemeSwitcher.storageKey] ?? 'auto'
        } catch {
            return 'auto'
        }
    }
}
