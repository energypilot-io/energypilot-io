import { Component, computed, effect, inject, signal } from '@angular/core'

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
import { formatPower } from '../../libs/utils'
import { WebsocketService } from '../../services/websocket.service'
import { ApiService } from '../../services/api.service'

import {
    TranslateService,
    TranslatePipe,
    TranslateDirective,
    _,
} from '@ngx-translate/core'
import { Subscription } from 'rxjs'
import { endOfDay, startOfDay } from 'date-fns'
import {
    onTimeRangeChangeEvent,
    TimerangeSelectorComponent,
} from '../ui/timerange-selector/timerange-selector'

echarts.use([
    TooltipComponent,
    LineChart,
    CanvasRenderer,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
])

@Component({
    selector: 'com-energy-chart',
    imports: [
        NgxEchartsDirective,
        TranslatePipe,
        TranslateDirective,
        TimerangeSelectorComponent,
    ],
    templateUrl: './energy-chart.html',
    styleUrl: './energy-chart.css',
    providers: [provideEchartsCore({ echarts })],
})
export class EnergyChartComponent {
    private api = inject(ApiService)
    private websocket = inject(WebsocketService)
    private translate = inject(TranslateService)

    private getDevicesSubscription?: Subscription
    private getSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    private fromDate = signal<Date>(new Date())
    private toDate = signal<Date>(new Date())

    private devices = signal<string[]>([])

    private timestamps = signal<Date[]>([])

    private powerValues = signal<{ [deviceName: string]: number[] }>({})
    private socValues = signal<{ [deviceName: string]: number[] }>({})

    mergeOption = computed<echarts.EChartsCoreOption>(() => {
        return {
            xAxis: {
                type: 'category',
                data: this.timestamps().map((timestamp: Date) => {
                    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
                }),
            },

            series: [
                ...Object.keys(this.powerValues()).map(deviceName => {
                    return {
                        name: deviceName,
                        type: 'line',
                        smooth: true,
                        symbol: 'none',
                        data: this.powerValues()[deviceName],
                        tooltip: {
                            valueFormatter: (value: number) => {
                                const formattedValue = formatPower(value)
                                return `${formattedValue?.value} ${formattedValue?.unit}`
                            },
                        },
                    }
                }),

                ...Object.keys(this.socValues()).map(deviceName => {
                    return {
                        name: `${deviceName} SoC`,
                        type: 'line',
                        smooth: true,
                        symbol: 'none',
                        yAxisIndex: 1,
                        data: this.socValues()[deviceName],
                        tooltip: {
                            valueFormatter: (value: number) => {
                                return `${value.toFixed(2)} %`
                            },
                        },
                    }
                }),
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
        dataZoom: [
            {
                type: 'slider',
                filterMode: 'weakFilter',
                showDataShadow: false,
                labelFormatter: '',
            },
            {
                type: 'inside',
                filterMode: 'weakFilter',
            },
        ],

        yAxis: [
            {
                type: 'value',
                name: 'Power',
                axisLabel: {
                    formatter: function (a: number) {
                        const formatedPower = formatPower(a)
                        return `${formatedPower?.value} ${formatedPower?.unit}`
                    },
                },
            },

            {
                type: 'value',
                name: 'Battery SoC',
                min: 0,
                max: 100,
                offset: 0,
                axisLabel: {
                    formatter: function (a: number) {
                        return `${a}%`
                    },
                },
            },
        ],

        xAxis: {
            type: 'category',
        },
    }

    private addSnapshotsToChart(snapshots: any[]) {
        const powerValues = { ...this.powerValues() }
        const socValues = { ...this.socValues() }
        const timestamps = [...this.timestamps()]

        const translatedHomeName = this.translate.instant('device.home')

        snapshots.forEach(snapshot => {
            const snapshotCreateDate = new Date(snapshot.created_at)

            if (
                snapshotCreateDate.getTime() < this.fromDate().getTime() ||
                snapshotCreateDate.getTime() > this.toDate().getTime()
            ) {
                return
            }

            timestamps.push(new Date(snapshot.created_at))

            var homePowerConsumption = 0

            const sortedDeviceSnapshots = snapshot.device_snapshots.sort(
                (n1: any, n2: any) => {
                    if (n1.device_name < n2.device_name) return -1
                    if (n1.device_name > n2.device_name) return 1
                    return 0
                }
            )

            sortedDeviceSnapshots.forEach((deviceSnapshot: any) => {
                if (deviceSnapshot.name === 'power') {
                    if (!powerValues[deviceSnapshot.device_name]) {
                        powerValues[deviceSnapshot.device_name] = []
                    }
                    powerValues[deviceSnapshot.device_name].push(
                        deviceSnapshot.value ?? 0
                    )

                    homePowerConsumption += deviceSnapshot.value
                } else if (deviceSnapshot.name === 'soc') {
                    if (!socValues[deviceSnapshot.device_name]) {
                        socValues[deviceSnapshot.device_name] = []
                    }
                    socValues[deviceSnapshot.device_name].push(
                        deviceSnapshot.value ?? 0
                    )
                }
            })

            this.devices()
                .filter(
                    deviceName =>
                        sortedDeviceSnapshots
                            .filter(
                                (ds: any) =>
                                    ds.name == 'power' || ds.name == 'soc'
                            )
                            .map((ds: any) => ds.device_name)
                            .indexOf(deviceName) === -1
                )
                .forEach(deviceName => {
                    if (!powerValues[deviceName]) {
                        powerValues[deviceName] = []
                    }
                    powerValues[deviceName].push(0.0)
                })

            if (!powerValues[translatedHomeName]) {
                powerValues[translatedHomeName] = []
            }
            powerValues[translatedHomeName].push(-homePowerConsumption)
        })

        this.powerValues.set(powerValues)
        this.socValues.set(socValues)
        this.timestamps.set(timestamps)
    }

    public onTimeRangeChange(event: onTimeRangeChangeEvent): void {
        this.fromDate.set(event.fromDate)
        this.toDate.set(event.toDate)
    }

    constructor() {
        effect(() => {
            if (this.devices().length === 0) {
                return
            }

            this.timestamps.set([])
            this.powerValues.set({})
            this.socValues.set({})

            this.getSnapshotsSubscription = this.api
                .getSnapshots(
                    `${this.fromDate().getTime()}-${this.toDate().getTime()}`
                )
                .subscribe(snapshots => {
                    this.addSnapshotsToChart(snapshots)
                })
        })
    }

    ngOnInit() {
        this.getDevicesSubscription = this.api
            .getAllDevices()
            .subscribe(devices => {
                this.devices.set(
                    devices
                        .sort((a: any, b: any) => {
                            if (a.name < b.name) return -1
                            if (a.name > b.name) return 1
                            return 0
                        })
                        .map((device: any) => device.name)
                )

                this.webserviceSubscription = this.websocket
                    .getMessage('snapshot:new')
                    .subscribe(data => {
                        this.addSnapshotsToChart([JSON.parse(data)])
                    })
            })
    }

    ngOnDestroy(): void {
        this.getDevicesSubscription?.unsubscribe()
        this.webserviceSubscription?.unsubscribe()
        this.getSnapshotsSubscription?.unsubscribe()
    }
}
