import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { DateAdapter, MatOptionModule } from '@angular/material/core'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { TranslateService } from '@ngx-translate/core'
import { enUS, de } from 'date-fns/locale'

type LanguageItem = {
    label: string
    isocode: string
}

@Component({
    selector: 'app-language-picker',
    imports: [
        MatSelectModule,
        MatOptionModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
    ],
    templateUrl: './language-picker.html',
    styleUrl: './language-picker.css',
})
export class LanguagePickerComponent {
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

    constructor(private _adapter: DateAdapter<any>) {}

    private setLanguage(lang: string) {
        this.translate.use(lang)

        switch (lang) {
            case 'de':
                this._adapter.setLocale(de)
                break

            case 'en':
            default:
                this._adapter.setLocale(enUS)
                break
        }
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
        this.reloadPage()
    }

    storeLanguage(lang: string) {
        try {
            window.localStorage[LanguagePickerComponent.storageKey] = lang
        } catch {}
    }

    getStoredLanguage(): string | null {
        try {
            return (
                window.localStorage[LanguagePickerComponent.storageKey] || null
            )
        } catch {
            return null
        }
    }

    clearStorage() {
        try {
            window.localStorage.removeItem(LanguagePickerComponent.storageKey)
        } catch {}
    }

    reloadPage() {
        window.location.reload()
    }
}
