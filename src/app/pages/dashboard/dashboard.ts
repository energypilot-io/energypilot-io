import { Component } from '@angular/core'
import { EnergyDistribution } from '../../components/widgets/energy-distribution/energy-distribution'
import { EnergyKpis } from '@/app/components/widgets/energy-kpis/energy-kpis'
import { EnergyLiveValues } from '@/app/components/widgets/energy-live-values/energy-live-values'

@Component({
    selector: 'app-dashboard',
    imports: [EnergyDistribution, EnergyKpis, EnergyLiveValues],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class DashboardPage {}
