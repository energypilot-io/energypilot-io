import { NgClass } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
    Component,
    EventEmitter,
    inject,
    Input,
    Output,
    signal,
    ViewEncapsulation,
} from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
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
} from '@ng-icons/tabler-icons'

export type MenuItem = {
    label: string
    icon?: string
    route?: string
    externalLink?: string
}

@Component({
    selector: 'app-sidenav',
    imports: [RouterModule, NgClass, NgIcon, NgbModule, TranslatePipe],
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

    sidenavCollapsed = signal(false)
    isMobile = signal(false)

    @Input() set collapsed(val: boolean) {
        this.sidenavCollapsed.set(val)
    }

    @Input() set mobile(val: boolean) {
        this.isMobile.set(val)
    }

    @Output() closeEvent = new EventEmitter<void>()
}
