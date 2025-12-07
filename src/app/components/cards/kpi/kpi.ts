import { Component, computed, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CallbackDataParams } from 'echarts/types/dist/shared'
import { formatEnergy } from '@/app/libs/utils'
import { ApiService } from '@/app/services/api.service'
import { Subscription } from 'rxjs'
import { WebsocketService } from '@/app/services/websocket.service'
import { FormatEnergyPipe } from '../../pipes/formatEnergy.pipe'

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

    currentTimeRange = signal<TimeRange>(TimeRange.Day)

    private baseProduction: number = 0
    private baseTotalExport: number = 0

    private baseConsumption: number = 0
    private baseTotalImport: number = 0

    totalProduction = signal<number>(0)
    totalExport = signal<number>(0)

    totalConsumption = signal<number>(0)
    totalImport = signal<number>(0)

    mergeOption = computed<echarts.EChartsCoreOption>(() => {
        return {
            series: [
                {
                    name: 'Access From',
                    type: 'pie',
                    radius: ['70%', '90%'],
                    avoidLabelOverlap: false,
                    padAngle: 5,
                    itemStyle: {
                        borderRadius: 10,
                    },
                    label: {
                        show: false,
                        position: 'center',
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
        this.baseConsumption = 0
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
                if (deviceSnapshot.device_type === "pv" && deviceSnapshot.name === 'energy') {
                    this.baseProduction += deviceSnapshot.value
                } else if(deviceSnapshot.device_type === "grid") {
                    if (deviceSnapshot.name === 'energy_import') {
                        this.baseTotalImport += deviceSnapshot.value
                    }
                    else if (
                        deviceSnapshot.name === 'energy_export' &&
                        deviceSnapshot.value > 0
                    ) {
                        this.baseTotalExport += deviceSnapshot.value
                    } else if (deviceSnapshot.name === 'energy') {
                        this.baseConsumption += deviceSnapshot.value
                    }
                }
            })
    }

    private updateKPIValues(snapshot: any) {
        var totalExport: number = 0
        var totalProduction: number = 0
        var totalImport: number = 0
        var totalConsumption: number = 0

        snapshot.device_snapshots
            .filter((deviceSnapshot: any) => {
                return (
                    deviceSnapshot.name === 'energy_export' ||
                    deviceSnapshot.name === 'energy_import' ||
                    deviceSnapshot.name === 'energy'
                )
            })
            .forEach((deviceSnapshot: any) => {
                if(deviceSnapshot.device_type === "pv" && deviceSnapshot.name === 'energy') {
                    totalProduction += deviceSnapshot.value
                } else if(deviceSnapshot.device_type === "grid") {
                    if (
                        deviceSnapshot.name === 'energy_export' &&
                        deviceSnapshot.value > 0
                    ) {
                        totalExport += deviceSnapshot.value
                    } else if (
                        deviceSnapshot.name === 'energy_import'
                    ) {
                        totalImport += deviceSnapshot.value
                    } else if (deviceSnapshot.name === 'energy') {
                        totalConsumption += deviceSnapshot.value
                    }
                }
            })

        this.totalProduction.set(totalProduction - this.baseProduction)
        this.totalExport.set(totalExport - this.baseTotalExport)
        this.totalConsumption.set(totalConsumption - this.baseConsumption)
        this.totalImport.set(totalImport - this.baseTotalImport)
    }

    ngOnInit() {
        this.getFirstSnapshotsSubscription = this.api
            .getSnapshots('today/1')
            .subscribe(snapshot => {
                console.log(snapshot[0])
                this.setBaseValues(snapshot[0])
            })

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
