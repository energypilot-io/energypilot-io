import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from '@angular/core'
import { provideRouter } from '@angular/router'

import { provideFormlyCore } from '@ngx-formly/core'
import { withFormlyMaterial } from '@ngx-formly/material'

import { routes } from './app.routes'
import { provideHttpClient } from '@angular/common/http'
import { ObjectTypeComponent } from './components/object.type'

import { SocketIoConfig, provideSocketIo } from 'ngx-socket-io'

import { provideTranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'

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
            lang: 'en',
        }),
        provideRouter(routes),
        provideHttpClient(),
        provideSocketIo(config),
        provideFormlyCore([
            ...withFormlyMaterial(),
            { types: [{ name: 'object', component: ObjectTypeComponent }] },
        ]),
    ],
}
