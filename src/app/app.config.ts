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

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(),
        provideFormlyCore([
            ...withFormlyMaterial(),
            { types: [{ name: 'object', component: ObjectTypeComponent }] },
        ]),
    ],
}
