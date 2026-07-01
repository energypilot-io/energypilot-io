import { NgClass, NgTemplateOutlet } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
    Component,
    inject,
    Input,
    output,
    signal,
    ViewEncapsulation,
} from '@angular/core'
import { NgbCollapse, NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

import { RouterModule } from '@angular/router'
import { NgIcon, provideIcons, provideNgIconLoader } from '@ng-icons/core'
import {
    tablerLayoutDashboard,
    tablerChartHistogram,
    tablerDevices,
    tablerBrandGithub,
    tablerBrandDiscord,
    tablerBrandBluesky,
    tablerCircleX,
    tablerSettings,
    tablerSun,
    tablerBrandTelegram,
    tablerSettingsHeart,
    tablerRobotFace,
} from '@ng-icons/tabler-icons'

export type MenuItem = {
    label: string
    icon?: string
    route?: string
    externalLink?: string
}

@Component({
    selector: 'app-sidenav',
    imports: [
        RouterModule,
        NgClass,
        NgIcon,
        NgbModule,
        TranslatePipe,
        NgTemplateOutlet,
        NgbCollapse,
    ],
    templateUrl: './sidenav.html',
    styleUrl: './sidenav.scss',
    providers: [
        provideIcons({
            tablerLayoutDashboard,
            tablerChartHistogram,
            tablerDevices,
            tablerBrandGithub,
            tablerBrandDiscord,
            tablerBrandBluesky,
            tablerCircleX,
            tablerSettings,
            tablerSun,
            tablerBrandTelegram,
            tablerSettingsHeart,
            tablerRobotFace,
        }),
        provideNgIconLoader((name: string): any => {
            const http = inject(HttpClient)
            return http.get(`/assets/${name}.svg`, { responseType: 'text' })
        }),
    ],
    encapsulation: ViewEncapsulation.None,
})
export class Sidenav {
    topMenuItems: MenuItem[] = [
        {
            label: 'pages.dashboard',
            icon: 'tablerLayoutDashboard',
            route: 'dashboard',
        },

        {
            label: 'pages.graphs',
            icon: 'tablerChartHistogram',
            route: 'graph',
        },

        {
            label: 'pages.devices',
            icon: 'tablerDevices',
            route: 'devices',
        },
    ]

    bottomMenuItems: MenuItem[] = [
        {
            label: 'Github',
            icon: 'tablerBrandGithub',
            externalLink: 'https://github.com/energypilot-io/energypilot-io',
        },

        {
            label: 'Bluesky',
            icon: 'tablerBrandBluesky',
            externalLink: 'https://bsky.app/profile/energypilot.io',
        },

        {
            label: 'Discord',
            icon: 'tablerBrandDiscord',
            externalLink: 'https://discord.gg/YAsTew8m92',
        },
    ]

    settingsItems: MenuItem[] = [
        {
            label: 'pages.modules.general',
            icon: 'tablerSettingsHeart',
            route: 'settings/general',
        },

        {
            label: 'pages.modules.solar_forecast',
            icon: 'tablerSun',
            route: 'settings/solar_forecast',
        },

        {
            label: 'pages.modules.telegram_bot',
            icon: 'tablerBrandTelegram',
            route: 'settings/telegram_bot',
        },

        {
            label: 'pages.modules.mcp_server',
            icon: 'tablerRobotFace',
            route: 'settings/mcp_server',
        },
    ]

    isCollapsed = true

    sidenavCollapsed = signal(false)
    isMobile = signal(false)

    @Input() set collapsed(val: boolean) {
        this.sidenavCollapsed.set(val)
    }

    @Input() set mobile(val: boolean) {
        this.isMobile.set(val)
    }

    closeEvent = output<void>()
}
