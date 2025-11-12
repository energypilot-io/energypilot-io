import { Component, computed, inject, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppComponent } from './components/test'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { CustomSidenav } from './components/custom-sidenav/custom-sidenav'
import { ThemePickerComponent } from './components/theme-picker/theme-picker'
import { TranslateService } from '@ngx-translate/core'
import { LanguagePickerComponent as LanguagePickerComponent } from './components/language-picker/language-picker'

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
    private translate = inject(TranslateService)

    protected readonly title = signal('energypilot-io')

    sidenavCollapsed = signal(false)
    sidenavWidth = computed(() => (this.sidenavCollapsed() ? '60px' : '200px'))

    constructor() {
        this.translate.addLangs(['de', 'en'])
        this.translate.setFallbackLang('en')
        this.translate.use(this.translate.getBrowserLang() ?? 'en')
    }
}
