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

const WATT_HOURS_SCALE = 1000

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

    private api = inject(ApiService)
    private translate = inject(TranslateService)

    private getSolarForecastSubscription?: Subscription

    private dayIndex = signal<number>(0)

    private day = computed<string | undefined>(() => {
        const data = this.forecastData()
        if (!data) return undefined
        return Object.keys(data)[this.dayIndex()]
    })

    private wattHoursPeriod = computed<any[]>(() => {
        const data = this.forecastData()
        const currentDayKey = this.day()

        if (!data || !currentDayKey) return []

        const timestampInterval = interval(
            addMinutes(new Date(), -30),
            addMinutes(new Date(), 30)
        )

        const dayData = data[currentDayKey]

        return Object.keys(dayData)
            .sort()
            .map(timestamp => {
                const dateObj = new Date(timestamp)
                const highlight = isWithinInterval(dateObj, timestampInterval)

                return {
                    value:
                        dayData[timestamp].wattHoursPeriod / WATT_HOURS_SCALE,
                    itemStyle: {
                        color: highlight ? '#F3722C' : '#5470c6',
                        borderRadius: [20, 20, 0, 0],
                    },
                }
            })
    })

    private wattHours = computed<number[]>(() => {
        const data = this.forecastData()
        const currentDayKey = this.day()

        if (!data || !currentDayKey) return []

        const dayData = data[currentDayKey]

        return Object.keys(dayData)
            .sort()
            .map(timestamp => {
                return dayData[timestamp].wattHours / WATT_HOURS_SCALE
            })
    })

    private language = signal<string>(this.translate.getCurrentLang())

    canMoveUp = input<boolean>(true)
    canMoveDown = input<boolean>(true)

    moveUp = input<OutputEmitterRef<string>>()
    moveDown = input<OutputEmitterRef<string>>()

    forecastData = signal<any>(undefined)

    timestamps = computed<Date[]>(() => {
        const data = this.forecastData()
        const currentDayKey = this.day()

        if (!data || !currentDayKey) return []

        const dayData = data[currentDayKey]
        // Sort and map only if data exists for the day
        if (!dayData) return []

        return Object.keys(dayData)
            .sort()
            .map(timestamp => new Date(timestamp))
    })

    dailyProduction = computed<number>(() => {
        const series = this.wattHoursPeriod()
        return series.reduce((acc, b: { value: number }) => acc + b.value, 0)
    })

    remainingProduction = computed<number>(() => {
        const data = this.forecastData()
        const currentDayKey = this.day()

        if (!data || !currentDayKey) return 0

        const dayData = data[currentDayKey]

        return Object.keys(dayData)
            .filter(timestamp =>
                isAfter(new Date(timestamp), addMinutes(new Date(), -30))
            )
            .map(
                timestamp =>
                    dayData[timestamp].wattHoursPeriod / WATT_HOURS_SCALE
            )
            .reduce((acc, b) => acc + b, 0)
    })

    currentDayLabel = computed<string>(() => {
        const dayKey = this.day()

        if (!dayKey) return ''

        const date = parse(dayKey, 'yyyy-MM-dd', new Date())

        // Handle empty language string gracefully
        const locale = this.language() === 'en' ? 'en-US' : 'de-DE'

        return date.toLocaleDateString(locale)
    })

    mergeOption = computed<echarts.EChartsCoreOption>(() => {
        const energyLabel = this.translate.instant(
            'widgets.solar-forecast.energy'
        )
        const totalEnergyLabel = this.translate.instant(
            'widgets.solar-forecast.total-energy'
        )

        return {
            xAxis: {
                type: 'category',
                data: this.timestamps().map((timestamp: Date) => {
                    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
                }),
            },
            series: [
                {
                    name: energyLabel,
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
                    name: totalEnergyLabel,
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
        const yAxisFormatter = (a: number) => {
            const formatedPower = formatEnergy(a)
            return `${formatedPower?.value} ${formatedPower?.unit}`
        }

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
                        formatter: yAxisFormatter,
                    },
                },
                {
                    type: 'value',
                    axisLabel: {
                        formatter: yAxisFormatter,
                    },
                },
            ],
        }
    })

    ngOnInit() {
        // Ensure API is available before subscribing
        if (!this.api) return

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
        // Safe unsubscribe even if subscription was not initialized
        this.getSolarForecastSubscription?.unsubscribe()
    }

    public decrementForecastDay() {
        const current = this.dayIndex()
        if (current > 0) {
            this.dayIndex.update(acc => acc - 1)
        }
    }

    public incrementForecastDay() {
        const current = this.dayIndex()
        if (current === 0) {
            this.dayIndex.update(acc => acc + 1)
        }
    }
}
