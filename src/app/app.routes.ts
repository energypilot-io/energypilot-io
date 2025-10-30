import { Routes } from '@angular/router'
import { DashboardComponent } from './pages/dashboard/dashboard'
import { DevicesComponent } from './pages/devices/devices'

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
    },

    {
        path: 'devices',
        component: DevicesComponent,
    },
]
