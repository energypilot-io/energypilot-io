import { Component, computed, inject, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppComponent } from './components/test'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule, MatIconRegistry } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { CustomSidenav } from './components/custom-sidenav/custom-sidenav'
import { ThemePickerComponent } from './components/theme-picker/theme-picker'
import { TranslateService } from '@ngx-translate/core'
import { LanguagePickerComponent as LanguagePickerComponent } from './components/language-picker/language-picker'
import { DomSanitizer } from '@angular/platform-browser'

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        AppComponent,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatSidenavModule,
        CustomSidenav,
        ThemePickerComponent,
        LanguagePickerComponent,
    ],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    static storageKey = 'energypilot-sidebar-collapsed'

    private translate = inject(TranslateService)

    sidenavCollapsed = signal(false)
    sidenavWidth = computed(() => (this.sidenavCollapsed() ? '60px' : '200px'))

    constructor() {
        this.translate.addLangs(['de', 'en'])
        this.translate.setFallbackLang('en')
        this.translate.use(this.translate.getBrowserLang() ?? 'en')

        const iconRegistry = inject(MatIconRegistry)
        const sanitizer = inject(DomSanitizer)

        iconRegistry.addSvgIcon(
            'plane',
            sanitizer.bypassSecurityTrustResourceUrl('assets/icons/plane.svg')
        )
    }

    ngOnInit(): void {
        this.sidenavCollapsed.set(this.getStoredStatus() ?? false)
    }

    storeStatus(collapsed: boolean) {
        this.sidenavCollapsed.set(collapsed)

        try {
            window.localStorage[App.storageKey] = collapsed
        } catch {}
    }

    getStoredStatus(): boolean | null {
        try {
            return window.localStorage[App.storageKey] || null
        } catch {
            return null
        }
    }
}
