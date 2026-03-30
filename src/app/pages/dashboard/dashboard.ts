import { Component } from '@angular/core'
import { EnergyDistribution } from '../../components/widgets/energy-distribution/energy-distribution'
import { EnergyKpis } from '@/app/components/widgets/energy-kpis/energy-kpis'

@Component({
    selector: 'app-dashboard',
    imports: [EnergyDistribution, EnergyKpis],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class DashboardPage {}
