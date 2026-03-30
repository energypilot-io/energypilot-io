import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from '@angular/core'
import { provideRouter } from '@angular/router'

import { routes } from './app.routes'

import { provideTranslateService, TranslateService } from '@ngx-translate/core'
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'
import { provideSocketIo, SocketIoConfig } from 'ngx-socket-io'

import { FORMLY_CONFIG, provideFormlyCore } from '@ngx-formly/core'
import { withFormlyBootstrap } from '@ngx-formly/bootstrap'
import { ObjectTypeComponent } from './types/object.type'
import { registerTranslateExtension } from './extensions/translate.extension'

const config: SocketIoConfig = {
    url: '/',
    options: { transports: ['websocket'], reconnection: true },
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),

        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: '/assets/i18n/',
                suffix: '.json',
            }),
            fallbackLang: 'en',
        }),

        provideSocketIo(config),

        {
            provide: FORMLY_CONFIG,
            multi: true,
            useFactory: registerTranslateExtension,
            deps: [TranslateService],
        },
        provideFormlyCore([
            ...withFormlyBootstrap(),
            { types: [{ name: 'object', component: ObjectTypeComponent }] },
        ]),
    ],
}
