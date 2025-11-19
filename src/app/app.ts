import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppComponent } from './components/test';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
    CustomSidenav,
    MenuItem,
} from './components/custom-sidenav/custom-sidenav';
import { ThemePickerComponent } from './components/theme-picker/theme-picker';
import { TranslateService } from '@ngx-translate/core';
import { LanguagePickerComponent as LanguagePickerComponent } from './components/language-picker/language-picker';
import { DomSanitizer } from '@angular/platform-browser';

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
        LanguagePickerComponent,
    ],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    static storageKey = 'energypilot-sidebar-collapsed';

    private translate = inject(TranslateService);

    sidenavCollapsed = signal(false);
    sidenavWidth = computed(() =>
        this.sidenavCollapsed() === true ? '60px' : '250px'
    );

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
    ]);

    bottomMenuItems = signal<MenuItem[]>([
        {
            label: 'Github',
            svgIcon: 'github',
            externalLink: 'https://github.com/energypilot-io/energypilot-io',
        },

        {
            label: 'Discord',
            svgIcon: 'discord',
            externalLink: 'https://discord.gg/YAsTew8m92',
        },
    ]);

    constructor() {
        this.translate.addLangs(['de', 'en']);
        this.translate.setFallbackLang('en');
        this.translate.use(this.translate.getBrowserLang() ?? 'en');

        const iconRegistry = inject(MatIconRegistry);
        const sanitizer = inject(DomSanitizer);

        iconRegistry.addSvgIcon(
            'logo',
            sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logo.svg')
        );
    }

    ngOnInit(): void {
        this.sidenavCollapsed.set(this.getStoredStatus() ?? false);
    }

    storeStatus(collapsed: boolean) {
        this.sidenavCollapsed.set(collapsed);

        try {
            window.localStorage[App.storageKey] = collapsed;
        } catch {}
    }

    getStoredStatus(): boolean | null {
        try {
            return (window.localStorage[App.storageKey] || null) === 'true';
        } catch {
            return null;
        }
    }
}
