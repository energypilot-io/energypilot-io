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
    addDays,
    addMinutes,
    endOfDay,
    format,
    interval,
    isAfter,
    isBefore,
    isWithinInterval,
    parse,
    startOfDay,
} from 'date-fns'
import { FormatEnergyPipe } from '@/app/pipes/formatEnergy.pipe'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { WidgetBase } from '../widget-base/widget-base'

const WATT_HOURS_SCALE = 1000

// How many days past today forward navigation is allowed to reach. The
// forecast.solar API only provides today and the next day, so the widget lets
// the user go at most one day forward. Backward navigation instead spans all
// historized days returned by the endpoint.
const FORECAST_FUTURE_DAYS = 1

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
    static name: string = 'solar_forecast'

    get name(): string {
        return SolarForecastWidget.name
    }

    private api = inject(ApiService)
    private translate = inject(TranslateService)

    private getSolarForecastSubscription?: Subscription

    private dayIndex = signal<number>(0)

    private dayKeys = computed<string[]>(() => {
        const data = this.forecastData()
        if (!data) return []
        return Object.keys(data).sort()
    })

    private day = computed<string | undefined>(() => {
        return this.dayKeys()[this.dayIndex()]
    })

    canGoBack = computed<boolean>(() => this.dayIndex() > 0)

    canGoForward = computed<boolean>(() => {
        const keys = this.dayKeys()
        const index = this.dayIndex()

        // No further day available in the loaded forecast data.
        if (index >= keys.length - 1) return false

        // Only allow navigating forward up to the next day forecast, even if
        // more future days happened to be returned by the endpoint.
        const currentDay = keys[index]
        const maxForecastDay = startOfDay(addDays(new Date(), FORECAST_FUTURE_DAYS))

        return isBefore(parse(currentDay, 'yyyy-MM-dd', new Date()), maxForecastDay)
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

        const now = new Date()

        // Request the full stored forecast history (from the epoch onwards) so
        // that backward navigation reflects the actual number of historized
        // days, together with the current forecast window.
        const from = 0
        const to = addDays(endOfDay(now), FORECAST_FUTURE_DAYS).getTime()

        this.getSolarForecastSubscription = this.api
            .getSolarForecastHistory(from, to)
            .subscribe(result => {
                if (!result) {
                    return
                }
                this.forecastData.set(result)

                // Start on today's forecast, falling back to the most recent
                // available day if today is not (yet) part of the result.
                const todayKey = format(now, 'yyyy-MM-dd')
                const keys = Object.keys(result).sort()
                const todayIndex = keys.indexOf(todayKey)

                this.dayIndex.set(
                    todayIndex >= 0 ? todayIndex : Math.max(0, keys.length - 1)
                )
            })
    }

    ngOnDestroy(): void {
        // Safe unsubscribe even if subscription was not initialized
        this.getSolarForecastSubscription?.unsubscribe()
    }

    public decrementForecastDay() {
        if (this.canGoBack()) {
            this.dayIndex.update(acc => acc - 1)
        }
    }

    public incrementForecastDay() {
        if (this.canGoForward()) {
            this.dayIndex.update(acc => acc + 1)
        }
    }
}
