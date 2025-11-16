import { Component } from '@angular/core'
import { EnergyDistributionComponent } from '../../components/cards/energy-distribution/energy-distribution'

@Component({
    selector: 'app-dashboard',
    imports: [EnergyDistributionComponent],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardPage {}
