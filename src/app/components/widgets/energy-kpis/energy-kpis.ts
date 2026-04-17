import { Component, computed, effect, inject, signal } from '@angular/core'
import {
    onTimeRangeChangeEvent,
    TimerangeSelector,
} from '../../ui/timerange-selector/timerange-selector'
import { ApiService } from '@/app/services/api.service'
import { WebsocketService } from '@/app/services/websocket.service'
import { Subscription } from 'rxjs'
import { FormatEnergyPipe } from '@/app/pipes/formatEnergy.pipe'
import { PercentPipe } from '@angular/common'
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'

import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CallbackDataParams } from 'echarts/types/dist/shared'
import { formatEnergy } from '@/app/libs/utils'

echarts.use([TooltipComponent, PieChart, CanvasRenderer, GridComponent])

@Component({
    selector: 'widget-energy-kpis',
    imports: [
        NgbModule,
        NgxEchartsDirective,
        FormatEnergyPipe,
        PercentPipe,
        TranslatePipe,
        TimerangeSelector,
    ],
    templateUrl: './energy-kpis.html',
    styleUrl: './energy-kpis.scss',
    providers: [provideEchartsCore({ echarts })],
})
export class EnergyKpis {
    readonly api = inject(ApiService)
    readonly websocket = inject(WebsocketService)
    readonly translate = inject(TranslateService)

    private getFirstSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    private baseProduction: number | undefined = undefined
    private baseTotalExport: number | undefined = undefined
    private baseOwnConsumption: number | undefined = undefined
    private baseTotalImport: number | undefined = undefined

    private fromDate = signal<Date>(new Date())
    private toDate = signal<Date>(new Date())

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
                        {
                            value: this.totalExport(),
                            name: this.translate.instant('widgets.kpi.export'),
                        },
                        {
                            value: this.totalProduction() - this.totalExport(),
                            name: this.translate.instant(
                                'widgets.kpi.consumption'
                            ),
                        },
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
                            {
                                value: this.totalImport(),
                                name: this.translate.instant(
                                    'widgets.kpi.import'
                                ),
                            },
                            {
                                value: this.totalOwnConsumption(),
                                name: this.translate.instant(
                                    'widgets.kpi.own-consumption'
                                ),
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

    private setBaseValues(snapshot: any) {
        this.totalProduction.set(0)
        this.totalExport.set(0)
        this.totalImport.set(0)
        this.totalOwnConsumption.set(0)

        if (!snapshot) return

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
                    this.baseProduction! += deviceSnapshot.value
                    this.baseOwnConsumption! += deviceSnapshot.value
                } else if (deviceSnapshot.device_type === 'grid') {
                    if (deviceSnapshot.name === 'energy_import') {
                        this.baseTotalImport! += deviceSnapshot.value
                    } else if (
                        deviceSnapshot.name === 'energy_export' &&
                        deviceSnapshot.value > 0
                    ) {
                        this.baseTotalExport! += deviceSnapshot.value
                        this.baseOwnConsumption! -= deviceSnapshot.value
                    }
                }
            })

        this.api
            .getSnapshots(
                `${this.fromDate().getTime()}-${this.toDate().getTime()}/-1`
            )
            .subscribe(snapshots => {
                this.updateKPIValues(snapshots[0])
            })
    }

    private updateKPIValues(snapshot: any) {
        const snapshotCreateDate = new Date(snapshot.created_at)

        if (
            snapshotCreateDate.getTime() < this.fromDate().getTime() ||
            snapshotCreateDate.getTime() > this.toDate().getTime()
        ) {
            return
        }

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

        const totalOwnConsumption = totalProduction - totalExport

        if (this.baseTotalExport === undefined)
            this.baseTotalExport = totalExport
        if (this.baseTotalImport === undefined)
            this.baseTotalImport = totalImport
        if (this.baseOwnConsumption === undefined)
            this.baseOwnConsumption = totalOwnConsumption
        if (this.baseProduction === undefined)
            this.baseProduction = totalProduction

        this.totalProduction.set(
            Math.abs(totalProduction - this.baseProduction)
        )
        this.totalExport.set(Math.abs(totalExport - this.baseTotalExport))
        this.totalImport.set(Math.abs(totalImport - this.baseTotalImport))
        this.totalOwnConsumption.set(
            Math.abs(totalOwnConsumption - this.baseOwnConsumption)
        )
    }

    public onTimeRangeChange(event: onTimeRangeChangeEvent): void {
        this.fromDate.set(event.fromDate)
        this.toDate.set(event.toDate)
    }

    constructor() {
        effect(() => {
            this.getFirstSnapshotsSubscription = this.api
                .getSnapshots(
                    `${this.fromDate().getTime()}-${this.toDate().getTime()}/1`
                )
                .subscribe(snapshots => {
                    this.setBaseValues(snapshots[0])
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
