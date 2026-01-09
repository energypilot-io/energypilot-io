import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from '@angular/core'
import { provideRouter } from '@angular/router'

import { FORMLY_CONFIG, provideFormlyCore } from '@ngx-formly/core'
import { withFormlyMaterial } from '@ngx-formly/material'

import { routes } from './app.routes'
import { provideHttpClient } from '@angular/common/http'
import { ObjectTypeComponent } from './components/object.type'

import { SocketIoConfig, provideSocketIo } from 'ngx-socket-io'

import { provideTranslateService, TranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'
import { registerTranslateExtension } from './translate.extension'
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter'
import { MAT_DATE_LOCALE } from '@angular/material/core'
import { enUS } from 'date-fns/locale'
import { provideNgxSkeletonLoader } from 'ngx-skeleton-loader'

const config: SocketIoConfig = {
    url: '/',
    options: { transports: ['websocket'], reconnection: true },
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: '/assets/i18n/',
                suffix: '.json',
            }),
            fallbackLang: 'en',
        }),
        provideRouter(routes),
        provideHttpClient(),
        provideSocketIo(config),
        {
            provide: FORMLY_CONFIG,
            multi: true,
            useFactory: registerTranslateExtension,
            deps: [TranslateService],
        },
        provideFormlyCore([
            ...withFormlyMaterial(),
            { types: [{ name: 'object', component: ObjectTypeComponent }] },
        ]),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: enUS },

        provideNgxSkeletonLoader({
            theme: {
                extendsFromRoot: true,
                height: '30px',
            },
        }),
    ],
}
