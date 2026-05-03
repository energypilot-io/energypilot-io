import { Component } from '@angular/core'
import { EnergyDistributionWidget } from '../../components/widgets/energy-distribution/energy-distribution'
import { EnergyKpisWidget } from '@/app/components/widgets/energy-kpis/energy-kpis'
import { EnergyLiveValuesWidget } from '@/app/components/widgets/energy-live-values/energy-live-values'
import { SolarForecastWidget } from '@/app/components/widgets/solar-forecast/solar-forecast'

@Component({
    selector: 'app-dashboard',
    imports: [
        EnergyDistributionWidget,
        EnergyKpisWidget,
        EnergyLiveValuesWidget,
        SolarForecastWidget,
    ],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class DashboardPage {}
