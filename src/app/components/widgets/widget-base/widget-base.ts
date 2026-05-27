import { Component, input, Input, output, signal } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { NgIcon, provideIcons } from '@ng-icons/core'

import {
    tablerWindowMinimize,
    tablerMaximize,
    tablerArrowDown,
    tablerArrowUp,
} from '@ng-icons/tabler-icons'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-widget-base',
    imports: [NgIcon, NgbModule, TranslatePipe],
    templateUrl: './widget-base.html',
    styleUrl: './widget-base.scss',
    providers: [
        provideIcons({
            tablerWindowMinimize,
            tablerMaximize,
            tablerArrowDown,
            tablerArrowUp,
        }),
    ],
})
export class WidgetBase {
    name = input<string>()
    header = input<string>()

    canMoveUp = input<boolean>(true)
    canMoveDown = input<boolean>(true)

    moveUp = output<string>()
    moveDown = output<string>()

    hidden = signal(false)

    ngOnInit(): void {
        this.hidden.set(this.getStoredStatus())
    }

    storeStatus(hidden: boolean) {
        this.hidden.set(hidden)

        try {
            window.localStorage[`${this.name()}.hidden`] = hidden
        } catch {}
    }

    getStoredStatus(): boolean {
        try {
            return (
                (window.localStorage[`${this.name()}.hidden`] || null) ===
                'true'
            )
        } catch {
            return false
        }
    }

    toggleVisibility() {
        this.storeStatus(!this.hidden())
    }
}
