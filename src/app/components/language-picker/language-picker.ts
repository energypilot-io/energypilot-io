import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatOptionModule } from '@angular/material/core'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule, MatIconRegistry } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { TranslateService } from '@ngx-translate/core'
import { DomSanitizer } from '@angular/platform-browser'

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

    constructor() {
        const iconRegistry = inject(MatIconRegistry)
        const sanitizer = inject(DomSanitizer)

        iconRegistry.addSvgIcon(
            'flag_de',
            sanitizer.bypassSecurityTrustResourceUrl('assets/flags/de.svg')
        )
        iconRegistry.addSvgIcon(
            'flag_en',
            sanitizer.bypassSecurityTrustResourceUrl('assets/flags/gb.svg')
        )
    }

    ngOnInit(): void {
        const currentLang = this.getStoredLanguage() ?? 'en'
        if (currentLang) {
            this.translate.use(currentLang)
        }
    }

    changeLanguage(lang: string) {
        this.translate.use(lang)
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
