import { Component, Input, signal } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { NgIcon, provideIcons } from '@ng-icons/core'

import { tablerMinimize, tablerMaximize } from '@ng-icons/tabler-icons'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-widget-base',
    imports: [NgIcon, NgbModule, TranslatePipe],
    templateUrl: './widget-base.html',
    styleUrl: './widget-base.scss',
    providers: [
        provideIcons({
            tablerMinimize,
            tablerMaximize,
        }),
    ],
})
export class WidgetBase {
    @Input() name: string = ''

    @Input() header?: string = undefined

    hidden = signal(false)

    ngOnInit(): void {
        this.hidden.set(this.getStoredStatus())
    }

    storeStatus(hidden: boolean) {
        this.hidden.set(hidden)

        try {
            window.localStorage[`${this.name}.hidden`] = hidden
        } catch {}
    }

    getStoredStatus(): boolean {
        try {
            return (
                (window.localStorage[`${this.name}.hidden`] || null) === 'true'
            )
        } catch {
            return false
        }
    }

    toggleVisibility() {
        this.storeStatus(!this.hidden())
    }
}
