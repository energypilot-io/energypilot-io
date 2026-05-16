import { ApiService } from '@/app/services/api.service'
import {
    Component,
    computed,
    inject,
    input,
    OutputEmitterRef,
    signal,
} from '@angular/core'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { formatEnergy } from '@/app/libs/utils'

import {
    tablerCircleChevronLeft,
    tablerCircleChevronRight,
} from '@ng-icons/tabler-icons'
import { NgIcon, provideIcons } from '@ng-icons/core'
import {
    addMinutes,
    interval,
    isAfter,
    isWithinInterval,
    parse,
} from 'date-fns'
import { FormatEnergyPipe } from '@/app/pipes/formatEnergy.pipe'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { WidgetBase } from '../widget-base/widget-base'

echarts.use([
    TooltipComponent,
    BarChart,
    LineChart,
    CanvasRenderer,
    GridComponent,
])

@Component({
    selector: 'widget-solar-forecast',
    imports: [
        NgxEchartsDirective,
        TranslatePipe,
        NgIcon,
        FormatEnergyPipe,
        NgxSkeletonLoaderModule,
        WidgetBase,
    ],
    templateUrl: './solar-forecast.html',
    styleUrl: './solar-forecast.scss',
    providers: [
        provideEchartsCore({ echarts }),
        provideIcons({
            tablerCircleChevronLeft,
            tablerCircleChevronRight,
        }),
    ],
    host: { class: 'col-12 col-md-6 col-xl-4 p-0' },
})
export class SolarForecastWidget {
    static name: string = 'widget-energy-solar-forecast'

    get name(): string {
        return SolarForecastWidget.name
    }

    canMoveUp = input<boolean>(true)
    canMoveDown = input<boolean>(true)

    moveUp = input<OutputEmitterRef<string>>()
    moveDown = input<OutputEmitterRef<string>>()

    private api = inject(ApiService)
    private translate = inject(TranslateService)

    private getSolarForecastSubscription?: Subscription

    private dayIndex = signal<number>(0)
    forecastData = signal<any>(undefined)

    private day = computed<string | undefined>(() => {
        const forecastData = this.forecastData()
        if (!forecastData) return undefined

        return Object.keys(forecastData)[this.dayIndex()]
    })

    timestamps = computed<Date[]>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return []

        return Object.keys(forecastData[this.day()!])
            .sort()
            .map(timestamp => new Date(timestamp))
    })

    private wattHoursPeriod = computed<any[]>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return []

        const timestampInterval = interval(
            addMinutes(new Date(), -30),
            addMinutes(new Date(), 30)
        )

        return Object.keys(forecastData[this.day()!])
            .sort()
            .map(timestamp => {
                const highlight = isWithinInterval(
                    new Date(timestamp),
                    timestampInterval
                )

                return {
                    value:
                        forecastData[this.day()!][timestamp].wattHoursPeriod /
                        1000.0,
                    itemStyle: {
                        color: highlight ? '#F3722C' : '#5470c6',
                        borderRadius: [20, 20, 0, 0],
                    },
                }
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

    private language = signal<string>(this.translate.getCurrentLang())

    dailyProduction = computed<number>(() => {
        return this.wattHoursPeriod().reduce((a, b: any) => a + b.value, 0)
    })

    remainingProduction = computed<number>(() => {
        const forecastData = this.forecastData()
        if (!forecastData || !this.day()) return 0

        return Object.keys(forecastData[this.day()!])
            .filter(timestamp =>
                isAfter(new Date(timestamp), addMinutes(new Date(), -30))
            )
            .map(
                timestamp =>
                    forecastData[this.day()!][timestamp].wattHoursPeriod /
                    1000.0
            )
            .reduce((a, b: any) => a + b, 0)
    })

    currentDayLabel = computed<string>(() => {
        if (!this.day()) return ''

        const date = parse(this.day()!, 'yyyy-MM-dd', new Date())
        return date.toLocaleDateString(
            this.language() == 'en' ? 'en-US' : 'de-DE'
        )
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
                    name: this.translate.instant(
                        'widgets.solar-forecast.energy'
                    ),
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
                    name: this.translate.instant(
                        'widgets.solar-forecast.total-energy'
                    ),
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

    chartOption = computed<echarts.EChartsCoreOption>(() => {
        return {
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
                    axisLabel: {
                        formatter: function (a: number) {
                            const formatedPower = formatEnergy(a)
                            return `${formatedPower?.value} ${formatedPower?.unit}`
                        },
                    },
                },

                {
                    type: 'value',
                    axisLabel: {
                        formatter: function (a: number) {
                            const formatedPower = formatEnergy(a)
                            return `${formatedPower?.value} ${formatedPower?.unit}`
                        },
                    },
                },
            ],
        }
    })

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

    public decrementForecastDay() {
        if (this.dayIndex() > 0) this.dayIndex.update(acc => acc - 1)
    }

    public incrementForecastDay() {
        if (this.dayIndex() === 0) this.dayIndex.update(acc => acc + 1)
    }
}
