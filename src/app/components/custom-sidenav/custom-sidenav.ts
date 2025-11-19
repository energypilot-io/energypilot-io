import { Component, inject, Input, signal } from '@angular/core'

import { MatListModule } from '@angular/material/list'
import { MatIconModule, MatIconRegistry } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { DomSanitizer } from '@angular/platform-browser'

export type MenuItem = {
    label: string
    icon?: string
    svgIcon?: string
    route?: string
    externalLink?: string
}

@Component({
    selector: 'app-custom-sidenav',
    imports: [MatListModule, MatIconModule, RouterModule],
    templateUrl: './custom-sidenav.html',
    styleUrl: './custom-sidenav.css',
})
export class CustomSidenav {
    sidenavCollapsed = signal(false)
    _items = signal<MenuItem[]>([])

    @Input() set collapsed(val: boolean) {
        this.sidenavCollapsed.set(val)
    }

    @Input() set items(val: MenuItem[]) {
        this._items.set(val)
    }

    constructor() {
        const iconRegistry = inject(MatIconRegistry)
        const sanitizer = inject(DomSanitizer)

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
    }
}
