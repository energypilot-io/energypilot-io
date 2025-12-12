import { Component } from '@angular/core'
import { EnergyChartComponent } from '@/app/components/ui/energy-chart/energy-chart'

@Component({
    selector: 'app-graph',
    imports: [EnergyChartComponent],
    templateUrl: './graph.html',
    styleUrl: './graph.css',
})
export class GraphPage {}
