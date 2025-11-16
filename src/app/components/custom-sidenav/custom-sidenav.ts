import { Component, Input, signal } from '@angular/core'

import { MatListModule } from '@angular/material/list'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'

export type MenuItem = {
    label: string
    icon: string
    route?: string
}

@Component({
    selector: 'app-custom-sidenav',
    imports: [MatListModule, MatIconModule, RouterModule],
    templateUrl: './custom-sidenav.html',
    styleUrl: './custom-sidenav.css',
})
export class CustomSidenav {
    sidenavCollapsed = signal(false)
    @Input() set collapsed(val: boolean) {
        this.sidenavCollapsed.set(val)
    }

    menuItems = signal<MenuItem[]>([
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
}
