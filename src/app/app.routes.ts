import { Routes } from '@angular/router'
import { DashboardPage } from './pages/dashboard/dashboard'
import { DevicesPage } from './pages/devices/devices'
import { GraphPage } from './pages/graph/graph'

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },
    {
        path: 'dashboard',
        component: DashboardPage,
    },

    {
        path: 'graph',
        component: GraphPage,
    },

    {
        path: 'devices',
        component: DevicesPage,
    },
]
