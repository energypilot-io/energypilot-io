import { Component, computed, inject, signal, effect } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'

import {
    endOfDay,
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
} from 'date-fns'
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core'
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CallbackDataParams } from 'echarts/types/dist/shared'
import { formatEnergy } from '@/app/libs/utils'
import { ApiService } from '@/app/services/api.service'
import { from, Subscription } from 'rxjs'
import { WebsocketService } from '@/app/services/websocket.service'
import { FormatEnergyPipe } from '@/app/components/pipes/formatEnergy.pipe'
import { PercentPipe } from '@angular/common'

echarts.use([TooltipComponent, PieChart, CanvasRenderer, GridComponent])

enum TimeRange {
    Day = 'day',
    Week = 'week',
    Month = 'month',
    Year = 'year',
}

@Component({
    selector: 'app-kpi',
    imports: [
        NgxEchartsDirective,
        MatCardModule,
        MatButtonModule,
        FormatEnergyPipe,
        PercentPipe,
        TranslatePipe,
        TranslateDirective,
    ],
    templateUrl: './kpi.html',
    styleUrl: './kpi.css',
    providers: [provideEchartsCore({ echarts })],
})
export class KpiComponent {
    private api = inject(ApiService)
    private websocket = inject(WebsocketService)

    private getFirstSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    private baseProduction: number = 0
    private baseTotalExport: number = 0

    private baseOwnConsumption: number = 0
    private baseTotalImport: number = 0

    currentTimeRange = signal<TimeRange>(TimeRange.Day)

    totalProduction = signal<number>(0)
    totalExport = signal<number>(0)

    totalOwnConsumption = signal<number>(0)
    totalImport = signal<number>(0)

    totalConsumption = computed<number>(() => {
        return this.totalOwnConsumption() + this.totalImport()
    })

    mergeOptionProductionExport = computed<echarts.EChartsCoreOption>(() => {
        return {
            color: ['#91cc75', '#5470c6'],
            series: [
                {
                    type: 'pie',
                    radius: ['70%', '90%'],
                    avoidLabelOverlap: false,
                    padAngle: 5,
                    itemStyle: {
                        borderRadius: 10,
                    },
                    label: {
                        show: false,
                    },
                    labelLine: {
                        show: false,
                    },
                    data: [
                        { value: this.totalExport(), name: 'Export' },
                        { value: this.totalProduction(), name: 'Production' },
                    ],
                },
            ],
        }
    })

    mergeOptionOwnConsumptionImport = computed<echarts.EChartsCoreOption>(
        () => {
            return {
                color: ['#ee6666', '#73c0de'],
                series: [
                    {
                        type: 'pie',
                        radius: ['70%', '90%'],
                        avoidLabelOverlap: false,
                        padAngle: 5,
                        itemStyle: {
                            borderRadius: 10,
                        },
                        label: {
                            show: false,
                        },
                        labelLine: {
                            show: false,
                        },
                        data: [
                            { value: this.totalImport(), name: 'Import' },
                            {
                                value: this.totalOwnConsumption(),
                                name: 'Own Consumption',
                            },
                        ],
                    },
                ],
            }
        }
    )

    chartOption: echarts.EChartsCoreOption = {
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: (params: CallbackDataParams) => {
                if (
                    params.value !== undefined &&
                    typeof params.value === 'number'
                ) {
                    const formatedValue = formatEnergy(params.value, true)
                    return `${params.name}: ${formatedValue?.value} ${formatedValue?.unit}`
                }
                return ''
            },
        },
        grid: {
            left: '0',
            right: '0',
            outerBoundsContain: 'all',
        },
    }

    public get TimeRange(): typeof TimeRange {
        return TimeRange
    }

    public setTimeRange(range: TimeRange): void {
        this.currentTimeRange.set(range)
    }

    private setBaseValues(snapshot: any) {
        this.baseTotalExport = 0
        this.baseProduction = 0
        this.baseOwnConsumption = 0
        this.baseTotalImport = 0

        snapshot.device_snapshots
            .filter((deviceSnapshot: any) => {
                return (
                    deviceSnapshot.name === 'energy_export' ||
                    deviceSnapshot.name === 'energy_import' ||
                    deviceSnapshot.name === 'energy'
                )
            })
            .forEach((deviceSnapshot: any) => {
                if (
                    deviceSnapshot.device_type === 'pv' &&
                    deviceSnapshot.name === 'energy'
                ) {
                    this.baseProduction += deviceSnapshot.value
                    this.baseOwnConsumption += deviceSnapshot.value
                } else if (deviceSnapshot.device_type === 'grid') {
                    if (deviceSnapshot.name === 'energy_import') {
                        this.baseTotalImport += deviceSnapshot.value
                    } else if (
                        deviceSnapshot.name === 'energy_export' &&
                        deviceSnapshot.value > 0
                    ) {
                        this.baseTotalExport += deviceSnapshot.value
                        this.baseOwnConsumption -= deviceSnapshot.value
                    }
                }
            })

        this.totalProduction.set(0)
        this.totalExport.set(0)
        this.totalImport.set(0)
        this.totalOwnConsumption.set(0)

        this.api.getSnapshots('latest').subscribe(snapshot => {
            this.updateKPIValues(snapshot)
        })
    }

    private updateKPIValues(snapshot: any) {
        var totalExport: number = 0
        var totalProduction: number = 0
        var totalImport: number = 0

        snapshot.device_snapshots
            .filter((deviceSnapshot: any) => {
                return (
                    deviceSnapshot.name === 'energy_export' ||
                    deviceSnapshot.name === 'energy_import' ||
                    deviceSnapshot.name === 'energy'
                )
            })
            .forEach((deviceSnapshot: any) => {
                if (
                    deviceSnapshot.device_type === 'pv' &&
                    deviceSnapshot.name === 'energy'
                ) {
                    totalProduction += deviceSnapshot.value
                } else if (deviceSnapshot.device_type === 'grid') {
                    if (
                        deviceSnapshot.name === 'energy_export' &&
                        deviceSnapshot.value > 0
                    ) {
                        totalExport += deviceSnapshot.value
                    } else if (deviceSnapshot.name === 'energy_import') {
                        totalImport += deviceSnapshot.value
                    }
                }
            })

        var totalOwnConsumption = totalProduction - totalExport

        this.totalProduction.set(
            Math.abs(totalProduction - this.baseProduction)
        )
        this.totalExport.set(Math.abs(totalExport - this.baseTotalExport))
        this.totalImport.set(Math.abs(totalImport - this.baseTotalImport))
        this.totalOwnConsumption.set(
            Math.abs(totalOwnConsumption - this.baseOwnConsumption)
        )
    }

    constructor() {
        effect(() => {
            const now = new Date()

            var fromDate: Date
            var toDate: Date

            if (this.currentTimeRange() === TimeRange.Day) {
                fromDate = startOfDay(now)
                toDate = endOfDay(now)
            } else if (this.currentTimeRange() === TimeRange.Week) {
                fromDate = startOfWeek(now)
                toDate = endOfWeek(now)
            } else if (this.currentTimeRange() === TimeRange.Month) {
                fromDate = startOfMonth(now)
                toDate = endOfMonth(now)
            } else if (this.currentTimeRange() === TimeRange.Year) {
                fromDate = startOfYear(now)
                toDate = endOfYear(now)
            }

            this.getFirstSnapshotsSubscription = this.api
                .getSnapshots(`${fromDate!.getTime()}-${toDate!.getTime()}/1`)
                .subscribe(snapshot => {
                    this.setBaseValues(snapshot[0])
                })
        })
    }

    ngOnInit() {
        this.webserviceSubscription = this.websocket
            .getMessage('snapshot:new')
            .subscribe(data => {
                this.updateKPIValues(JSON.parse(data))
            })
    }

    ngOnDestroy(): void {
        this.webserviceSubscription?.unsubscribe()
        this.getFirstSnapshotsSubscription?.unsubscribe()
    }
}
