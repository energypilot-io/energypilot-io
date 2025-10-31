import { Component } from '@angular/core'
import { EnergyChartComponent } from '../../components/energy-chart/energy-chart'

@Component({
    selector: 'app-dashboard',
    imports: [EnergyChartComponent],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardComponent {}
