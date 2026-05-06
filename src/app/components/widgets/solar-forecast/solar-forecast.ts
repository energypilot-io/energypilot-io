import { ApiService } from '@/app/services/api.service'
import { Component, computed, inject, signal } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { formatEnergy } from '@/app/libs/utils'

echarts.use([
    TooltipComponent,
    BarChart,
    LineChart,
    CanvasRenderer,
    GridComponent,
])

@Component({
    selector: 'widget-solar-forecast',
    imports: [NgxEchartsDirective, TranslatePipe],
    templateUrl: './solar-forecast.html',
    styleUrl: './solar-forecast.scss',
    providers: [provideEchartsCore({ echarts })],
})
export class SolarForecastWidget {
    private api = inject(ApiService)

    private getSolarForecastSubscription?: Subscription

    private dayIndex = signal<number>(0)
    private forecastData = signal<any>(undefined)

    private day = computed<string | undefined>(() => {
        const forecastData = this.forecastData()
        if (!forecastData) return undefined

        return Object.keys(forecastData)[this.dayIndex()]
    })

    private timestamps = computed<Date[]>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return []

        return Object.keys(forecastData[this.day()!])
            .sort()
            .map(timestamp => new Date(timestamp))
    })

    private wattHoursPeriod = computed<number[]>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return []

        return Object.keys(forecastData[this.day()!])
            .sort()
            .map(timestamp => {
                return (
                    forecastData[this.day()!][timestamp].wattHoursPeriod /
                    1000.0
                )
            })
    })

    private wattHours = computed<number[]>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return []

        return Object.keys(forecastData[this.day()!])
            .sort()
            .map(timestamp => {
                return forecastData[this.day()!][timestamp].wattHours / 1000.0
            })
    })

    mergeOption = computed<echarts.EChartsCoreOption>(() => {
        return {
            xAxis: {
                type: 'category',
                data: this.timestamps().map((timestamp: Date) => {
                    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
                }),
            },

            series: [
                {
                    name: 'Watt Hour Period',
                    type: 'bar',
                    smooth: true,
                    symbol: 'none',
                    data: this.wattHoursPeriod(),
                    tooltip: {
                        valueFormatter: (value: number) => {
                            const formattedValue = formatEnergy(value)
                            return `${formattedValue?.value} ${formattedValue?.unit}`
                        },
                    },
                },

                {
                    name: 'Watt Hour',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    data: this.wattHours(),
                    yAxisIndex: 1,
                    tooltip: {
                        valueFormatter: (value: number) => {
                            const formattedValue = formatEnergy(value)
                            return `${formattedValue?.value} ${formattedValue?.unit}`
                        },
                    },
                },
            ],
        }
    })

    chartOption: echarts.EChartsCoreOption = {
        tooltip: {
            trigger: 'axis',
            triggerOn: 'mousemove',

            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985',
                },
            },
        },
        grid: {
            left: '0',
            right: '0',
            outerBoundsContain: 'all',
        },
        animation: true,
        legend: {
            show: true,
        },

        yAxis: [
            {
                type: 'value',
                name: 'Energy',
                axisLabel: {
                    formatter: function (a: number) {
                        const formatedPower = formatEnergy(a)
                        return `${formatedPower?.value} ${formatedPower?.unit}`
                    },
                },
            },

            {
                type: 'value',
                name: 'Total Energy',
                axisLabel: {
                    formatter: function (a: number) {
                        const formatedPower = formatEnergy(a)
                        return `${formatedPower?.value} ${formatedPower?.unit}`
                    },
                },
            },
        ],
    }

    ngOnInit() {
        this.getSolarForecastSubscription = this.api
            .getSolarForecastData()
            .subscribe(result => {
                if (!result) {
                    return
                }

                this.forecastData.set(result)
            })
    }

    ngOnDestroy(): void {
        this.getSolarForecastSubscription?.unsubscribe()
    }
}
