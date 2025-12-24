import { Component, computed, inject, signal } from '@angular/core'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'
import { SankeyChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent } from 'echarts/components'

import { MatCardModule } from '@angular/material/card'
import { CallbackDataParams } from 'echarts/types/dist/shared'
import { formatPower } from '@/app/libs/utils'
import { WebsocketService } from '@/app/services/websocket.service'
import { Subscription } from 'rxjs'
import { ApiService } from '@/app/services/api.service'
import { TranslateService } from '@ngx-translate/core'

echarts.use([TooltipComponent, SankeyChart, CanvasRenderer, GridComponent])

type SankeyNode = { name: string; value: number; itemStyle?: any }
type SankeyLink = { source: string; target: string; value: number }

@Component({
    selector: 'app-energy-distribution',
    imports: [NgxEchartsDirective, MatCardModule],
    templateUrl: './energy-distribution.html',
    styleUrl: './energy-distribution.css',
    providers: [provideEchartsCore({ echarts })],
})
export class EnergyDistributionComponent {
    private api = inject(ApiService)
    private websocket = inject(WebsocketService)
    private translate = inject(TranslateService)

    private webserviceSubscription?: Subscription
    private getSnapshotsSubscription?: Subscription

    private nodes = signal<SankeyNode[]>([])
    private links = signal<SankeyLink[]>([])

    mergeOption = computed<echarts.EChartsCoreOption>(() => {
        return {
            series: [
                {
                    type: 'sankey',
                    data: this.nodes(),
                    links: this.links(),
                    draggable: false,
                    emphasis: {
                        focus: 'adjacency',
                    },
                    lineStyle: {
                        curveness: 0.5,
                        color: 'gradient',
                    },
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
                    const formatedValue = formatPower(params.value, true)
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

    private addSnapshotsToChart(snapshot: any) {
        const links: SankeyLink[] = []

        const targetDeviceSnapshots = snapshot.device_snapshots
            .filter(
                (deviceSnapshot: any) =>
                    deviceSnapshot.name === 'power' &&
                    deviceSnapshot.value !== 0
            )
            .sort((n1: any, n2: any) => n2.value - n1.value)

        type ConsumerValue = { deviceName: string; value: number }
        var consumers = targetDeviceSnapshots
            .filter((deviceSnapshot: any) => {
                return deviceSnapshot.value < 0
            })
            .map((deviceSnapshot: any) => {
                return {
                    deviceName: deviceSnapshot.device_name,
                    value: deviceSnapshot.value,
                } as ConsumerValue
            })

        var homePowerConsumption = 0
        const translatedHomeName = this.translate.instant('device.home')

        targetDeviceSnapshots
            .filter((deviceSnapshot: any) => deviceSnapshot.value > 0)
            .forEach((deviceSnapshot: any) => {
                var value: number = deviceSnapshot.value
                while (value > 0) {
                    if (consumers.length > 0) {
                        const consumer: ConsumerValue = consumers.pop()!

                        if (value >= Math.abs(consumer.value)) {
                            links.push({
                                source: deviceSnapshot.device_name,
                                target: consumer.deviceName,
                                value: Math.abs(consumer.value),
                            })

                            value -= Math.abs(consumer.value)
                        } else {
                            links.push({
                                source: deviceSnapshot.device_name,
                                target: consumer.deviceName,
                                value: value,
                            })

                            consumer.value += value
                            value = 0

                            consumers.push(consumer)
                        }
                    } else {
                        links.push({
                            source: deviceSnapshot.device_name,
                            target: translatedHomeName,
                            value: value,
                        })

                        homePowerConsumption += value
                        value = 0
                    }
                }
            })

        const nodes: SankeyNode[] = [
            {
                name: translatedHomeName,
                itemStyle: { color: '#277DA1' },
                value: homePowerConsumption,
            },
        ]

        targetDeviceSnapshots.forEach((deviceSnapshot: any) => {
            nodes.push({
                name: deviceSnapshot.device_name,
                itemStyle: { color: '#F3722C' },
                value: deviceSnapshot.value,
            })
        })

        this.nodes.set(nodes)
        this.links.set(links)
    }

    ngOnInit() {
        this.getSnapshotsSubscription = this.api
            .getSnapshots('latest')
            .subscribe(snapshot => {
                if (snapshot && Array.isArray(snapshot)) {
                    this.addSnapshotsToChart(snapshot[0])
                }
            })

        this.webserviceSubscription = this.websocket
            .getMessage('snapshot:new')
            .subscribe(data => {
                this.addSnapshotsToChart(JSON.parse(data))
            })
    }

    ngOnDestroy(): void {
        this.webserviceSubscription?.unsubscribe()
        this.getSnapshotsSubscription?.unsubscribe()
    }
}
