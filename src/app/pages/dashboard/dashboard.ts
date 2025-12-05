import { Component } from '@angular/core'
import { EnergyDistributionComponent } from '../../components/cards/energy-distribution/energy-distribution'
import { KpiComponent } from '@/app/components/cards/kpi/kpi'

@Component({
    selector: 'app-dashboard',
    imports: [EnergyDistributionComponent, KpiComponent],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardPage {}
