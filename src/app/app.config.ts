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

const config: SocketIoConfig = {
    url: '/',
    options: { transports: ['websocket'], reconnection: true },
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(),
        provideSocketIo(config),
        provideFormlyCore([
            ...withFormlyMaterial(),
            { types: [{ name: 'object', component: ObjectTypeComponent }] },
        ]),
    ],
}
