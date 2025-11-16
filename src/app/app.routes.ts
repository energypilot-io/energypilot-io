import { Routes } from '@angular/router'
import { DashboardPage } from './pages/dashboard/dashboard'
import { DevicesComponent as DevicesPage } from './pages/devices/devices'
import { GraphPage } from './pages/graph/graph'

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },

    {
        path: 'graph',
        component: GraphPage,
    },

    {
        path: 'dashboard',
        component: DashboardPage,
    },

    {
        path: 'devices',
        component: DevicesPage,
    },
]
