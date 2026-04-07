import { HttpClient } from '@angular/common/http'
import { Component, inject } from '@angular/core'
import { NgIcon, provideNgIconLoader } from '@ng-icons/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'

import {
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
} from '@ng-bootstrap/ng-bootstrap/dropdown'
import { TranslateService } from '@ngx-translate/core'

type LanguageItem = {
    label: string
    isocode: string
}

@Component({
    selector: 'app-language-switcher',
    imports: [
        NgIcon,
        NgbModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
    ],
    templateUrl: './language-switcher.html',
    styleUrl: './language-switcher.scss',
    providers: [
        provideNgIconLoader((name: string): any => {
            const http = inject(HttpClient)
            return http.get(`/assets/flags/${name}.svg`, {
                responseType: 'text',
            })
        }),
    ],
})
export class LanguageSwitcher {
    static storageKey = 'energypilot-language'

    protected translate = inject(TranslateService)

    supportedLanguages: LanguageItem[] = [
        {
            label: 'Deutsch',
            isocode: 'de',
        },

        {
            label: 'English',
            isocode: 'en',
        },
    ]

    // constructor(private _adapter: DateAdapter<any>) {}

    private setLanguage(lang: string) {
        this.translate.use(lang)

        // switch (lang) {
        //     case 'de':
        //         this._adapter.setLocale(de)
        //         break

        //     case 'en':
        //     default:
        //         this._adapter.setLocale(enUS)
        //         break
        // }
    }

    ngOnInit(): void {
        const currentLang = this.getStoredLanguage() ?? 'en'
        if (currentLang) {
            this.setLanguage(currentLang)
        }
    }

    changeLanguage(lang: string) {
        this.setLanguage(lang)
        this.storeLanguage(this.translate.getCurrentLang())
    }

    storeLanguage(lang: string) {
        try {
            window.localStorage[LanguageSwitcher.storageKey] = lang
        } catch {}
    }

    getStoredLanguage(): string | null {
        try {
            return window.localStorage[LanguageSwitcher.storageKey] || null
        } catch {
            return null
        }
    }

    clearStorage() {
        try {
            window.localStorage.removeItem(LanguageSwitcher.storageKey)
        } catch {}
    }
}
