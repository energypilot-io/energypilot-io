import { EnergyChart } from '@/app/components/energy-chart/energy-chart'
import { Component } from '@angular/core'

@Component({
    selector: 'app-graph',
    imports: [EnergyChart],
    templateUrl: './graph.html',
    styleUrl: './graph.scss',
})
export class GraphPage {}
