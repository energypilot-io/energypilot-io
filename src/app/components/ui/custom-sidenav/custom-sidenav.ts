import { Component, EventEmitter, Input, Output, signal } from '@angular/core'

import { MatListModule } from '@angular/material/list'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'

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
    _items = signal<MenuItem[]>([])

    sidenavCollapsed = signal(false)
    isMobile = signal(false)

    @Input() set collapsed(val: boolean) {
        this.sidenavCollapsed.set(val)
    }

    @Input() set items(val: MenuItem[]) {
        this._items.set(val)
    }

    @Input() set mobile(val: boolean) {
        this.isMobile.set(val)
    }

    @Output() onLinkClick = new EventEmitter<{}>()
}
