import { Component, computed, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppComponent } from './components/test'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { CustomSidenav } from './components/custom-sidenav/custom-sidenav'
import { ThemePickerComponent } from './components/theme-picker/theme-picker'

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
    ],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    protected readonly title = signal('energypilot-io')

    sidenavCollapsed = signal(false)
    sidenavWidth = computed(() => (this.sidenavCollapsed() ? '60px' : '200px'))
}
