import { Component } from '@angular/core'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'

import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
} from 'echarts/components'

echarts.use([LineChart, CanvasRenderer, GridComponent])

@Component({
    selector: 'com-energy-chart',
    imports: [NgxEchartsDirective],
    templateUrl: './energy-chart.html',
    styleUrl: './energy-chart.css',
    providers: [provideEchartsCore({ echarts })],
})
export class EnergyChartComponent {
    chartOption: echarts.EChartsCoreOption = {
        xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        yAxis: {
            type: 'value',
        },
        series: [
            {
                data: [820, 932, 901, 934, 1290, 1330, 1320],
                type: 'line',
            },
        ],
    }
}
