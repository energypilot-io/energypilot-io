import { Component, effect, OnInit, Renderer2, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

@Component({
    selector: 'app-theme-picker',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule],
    templateUrl: './theme-picker.html',
    styleUrl: './theme-picker.css',
})
export class ThemePickerComponent implements OnInit {
    mode = signal('light')
    static storageKey = 'energypilot-color-style'

    /**
     *
     */
    constructor(private renderer: Renderer2) {
        effect(() => {
            if (this.mode() == 'dark') {
                this.renderer.setStyle(
                    document.documentElement,
                    'color-scheme',
                    'dark'
                )
            } else {
                this.renderer.setStyle(
                    document.documentElement,
                    'color-scheme',
                    'light'
                )
            }
        })
    }

    ngOnInit(): void {
        const currentTheme =
            this.getStoredThemeName() ??
            (window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light')
        if (currentTheme) {
            this.mode.set(currentTheme)
        }
        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (event) => {
                const newColorScheme = event.matches ? 'dark' : 'light'
                if (event.matches) {
                    this.mode.set('dark')
                } else {
                    this.mode.set('light')
                }
            })
    }

    changeMode() {
        if (this.mode() == 'dark') this.mode.set('light')
        else this.mode.set('dark')
        this.storeTheme(this.mode())
    }

    storeTheme(theme: string) {
        try {
            window.localStorage[ThemePickerComponent.storageKey] = theme
        } catch {}
    }

    getStoredThemeName(): string | null {
        try {
            return window.localStorage[ThemePickerComponent.storageKey] || null
        } catch {
            return null
        }
    }

    clearStorage() {
        try {
            window.localStorage.removeItem(ThemePickerComponent.storageKey)
        } catch {}
    }
}
