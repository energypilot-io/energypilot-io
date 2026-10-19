import { Component, inject, signal, ViewEncapsulation } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { Sidenav } from './components/ui/sidenav/sidenav'
import { RouterModule } from '@angular/router'

import { NgIcon, provideIcons } from '@ng-icons/core'
import {
    tablerChevronLeft,
    tablerChevronRight,
    tablerMenu2,
} from '@ng-icons/tabler-icons'
import { ThemeSwitcher } from './components/ui/theme-switcher/theme-switcher'
import { TranslateService } from '@ngx-translate/core'
import { LanguageSwitcher } from './components/ui/language-switcher/language-switcher'
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'
import { ToastContainer } from './components/ui/toast-container/toast-container'
import { ApiService } from './services/api.service'

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        Sidenav,
        NgIcon,
        RouterModule,
        ThemeSwitcher,
        LanguageSwitcher,
        TranslatePipe,
        ToastContainer,
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss',
    providers: [
        provideIcons({ tablerChevronLeft, tablerChevronRight, tablerMenu2 }),
    ],
    encapsulation: ViewEncapsulation.None,
})
export class App {
    private translate = inject(TranslateService)
    private offcanvasService = inject(NgbOffcanvas)
    private api = inject(ApiService)

    static storageKey = 'energypilot-sidebar-collapsed'

    protected sidenavCollapsed = signal(false)
    protected apiPasswordStatus = signal<{
        passwordRequired: boolean
        usingDefaultPassword: boolean
    } | null>(null)

    constructor() {
        this.translate.addLangs(['de', 'en'])
        this.translate.setFallbackLang('en')
        this.translate.use(this.translate.getBrowserLang() ?? 'en')
        this.api
            .getApiAuthStatus()
            .subscribe(status => this.apiPasswordStatus.set(status))
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
            return (window.localStorage[App.storageKey] || null) === 'true'
        } catch {
            return null
        }
    }

    openMenuOffcanvas() {
        const offcanvasRef = this.offcanvasService.open(Sidenav, {
            position: 'start',
            backdrop: true,
        })
        offcanvasRef.componentInstance.mobile = true
        offcanvasRef.componentInstance.closeEvent.subscribe(() =>
            offcanvasRef.close()
        )
    }
}
