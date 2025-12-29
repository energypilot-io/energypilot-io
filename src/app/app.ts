import { Component, computed, inject, signal } from '@angular/core'
import { MediaMatcher } from '@angular/cdk/layout'
import { RouterOutlet } from '@angular/router'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule, MatIconRegistry } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import {
    CustomSidenav,
    MenuItem,
} from './components/ui/custom-sidenav/custom-sidenav'
import { ThemePickerComponent } from './components/ui/theme-picker/theme-picker'
import { TranslateService } from '@ngx-translate/core'
import { LanguagePickerComponent as LanguagePickerComponent } from './components/ui/language-picker/language-picker'
import { DomSanitizer } from '@angular/platform-browser'

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
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

    protected readonly isMobile = signal(true)

    private readonly _mobileQuery: MediaQueryList
    private readonly _mobileQueryListener: () => void

    sidenavCollapsed = signal(false)
    sidenavWidth = computed(() => {
        if (this.isMobile()) {
            return '85%'
        }

        return this.sidenavCollapsed() === true ? '60px' : '250px'
    })

    topMenuItems = signal<MenuItem[]>([
        {
            label: 'Dashboard',
            icon: 'dashboard',
            route: 'dashboard',
        },

        {
            label: 'Graph',
            icon: 'show_chart',
            route: 'graph',
        },

        {
            label: 'Devices',
            icon: 'devices',
            route: 'devices',
        },
    ])

    bottomMenuItems = signal<MenuItem[]>([
        {
            label: 'Github',
            svgIcon: 'github',
            externalLink: 'https://github.com/energypilot-io/energypilot-io',
        },

        {
            label: '@Bluesky',
            svgIcon: 'bluesky',
            externalLink: 'https://bsky.app/profile/nuker.bsky.social',
        },

        {
            label: 'Discord',
            svgIcon: 'discord',
            externalLink: 'https://discord.gg/YAsTew8m92',
        },
    ])

    ngOnDestroy(): void {
        this._mobileQuery.removeEventListener(
            'change',
            this._mobileQueryListener
        )
    }

    constructor() {
        this.translate.addLangs(['de', 'en'])
        this.translate.setFallbackLang('en')
        this.translate.use(this.translate.getBrowserLang() ?? 'en')

        const iconRegistry = inject(MatIconRegistry)
        const sanitizer = inject(DomSanitizer)

        iconRegistry.addSvgIcon(
            'logo',
            sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logo.svg')
        )

        iconRegistry.addSvgIcon(
            'github',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/github-142-svgrepo-com.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'discord',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/discord-icon-svgrepo-com.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'bluesky',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/bluesky_logo.svg'
            ),
            {}
        )

        iconRegistry.addSvgIcon(
            'electric_plug',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/power_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'battery',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/battery_0_bar_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'pv',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/solar_power_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'electric_grid',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/power_input_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'connection_state',
            sanitizer.bypassSecurityTrustResourceUrl(
                'assets/icons/radio_button_checked_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg'
            )
        )

        iconRegistry.addSvgIcon(
            'flag_de',
            sanitizer.bypassSecurityTrustResourceUrl('assets/flags/de.svg')
        )
        iconRegistry.addSvgIcon(
            'flag_en',
            sanitizer.bypassSecurityTrustResourceUrl('assets/flags/gb.svg')
        )

        const media = inject(MediaMatcher)

        this._mobileQuery = media.matchMedia('(max-width: 600px)')
        this.isMobile.set(this._mobileQuery.matches)
        this._mobileQueryListener = () =>
            this.isMobile.set(this._mobileQuery.matches)
        this._mobileQuery.addEventListener('change', this._mobileQueryListener)
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
}
