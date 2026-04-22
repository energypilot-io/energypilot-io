import { Component, computed, effect, inject, signal } from '@angular/core'

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts'
import * as echarts from 'echarts/core'

import { LineChart, BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
} from 'echarts/components'
import { formatEnergy, formatPower } from '@/app/libs/utils'
import { WebsocketService } from '@/app/services/websocket.service'
import { ApiService } from '@/app/services/api.service'

import { TranslateService, _ } from '@ngx-translate/core'
import { Subscription } from 'rxjs'
import {
    onTimeRangeChangeEvent,
    TimerangeSelector,
} from '../ui/timerange-selector/timerange-selector'
import { differenceInDays } from 'date-fns'

echarts.use([
    TooltipComponent,
    LineChart,
    BarChart,
    CanvasRenderer,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
])

@Component({
    selector: 'app-energy-chart',
    imports: [NgxEchartsDirective, TimerangeSelector],
    templateUrl: './energy-chart.html',
    styleUrl: './energy-chart.scss',
    providers: [provideEchartsCore({ echarts })],
})
export class EnergyChart {
    private api = inject(ApiService)
    private websocket = inject(WebsocketService)
    private translate = inject(TranslateService)

    private getDevicesSubscription?: Subscription
    private getSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    private fromDate = signal<Date>(new Date())
    private toDate = signal<Date>(new Date())

    private devices = signal<any[]>([])

    private timestamps = signal<Date[]>([])

    private powerOrEnergyValues = signal<{ [deviceName: string]: number[] }>({})
    private socValues = signal<{ [deviceName: string]: number[] }>({})

    private dataGrouping = computed<'hour' | 'day' | undefined>(() => {
        const differenceDays = differenceInDays(this.toDate(), this.fromDate())

        if (differenceDays >= 15) {
            return 'day'
        } else if (differenceDays >= 5) {
            return 'hour'
        }

        return undefined
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

            xAxis: {
                type: 'category',
                data: this.timestamps().map((timestamp: Date) => {
                    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
                }),
            },

            yAxis:
                this.dataGrouping() === 'day'
                    ? [
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
                      ]
                    : [
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

            series: [
                ...Object.keys(this.powerOrEnergyValues()).map(deviceName => {
                    return {
                        name: deviceName,
                        type: this.dataGrouping() === 'day' ? 'bar' : 'line',
                        stack: this.dataGrouping() === 'day' ? 'a' : undefined,
                        smooth: true,
                        symbol: 'none',
                        data: this.powerOrEnergyValues()[deviceName],
                        tooltip: {
                            valueFormatter: (value: number) => {
                                const formattedValue =
                                    this.dataGrouping() === 'day'
                                        ? formatEnergy(value)
                                        : formatPower(value)
                                return `${formattedValue?.value} ${formattedValue?.unit}`
                            },
                        },
                    }
                }),

                ...Object.keys(this.socValues()).map(deviceName => {
                    return {
                        name: `${deviceName} SoC`,
                        type: this.dataGrouping() === 'day' ? 'bar' : 'line',
                        stack: this.dataGrouping() === 'day' ? 'a' : undefined,
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

    private addSnapshotsToChart(
        snapshots: any[],
        source: 'api' | 'websocket' = 'api'
    ) {
        if (
            source === 'websocket' &&
            differenceInDays(this.toDate(), this.fromDate()) > 1
        ) {
            return
        }

        const powerOrEnergyValues = { ...this.powerOrEnergyValues() }
        const socValues = { ...this.socValues() }
        const timestamps = [...this.timestamps()]

        const translatedHomeName = this.translate.instant('device.home')

        const targetTypes =
            this.dataGrouping() === 'day'
                ? ['grid', 'consumer', 'pv']
                : ['grid', 'consumer', 'pv', 'battery']

        const targetNames = [
            ...(this.dataGrouping() === 'day'
                ? ['energy', 'energy_import', 'energy_export']
                : ['soc', 'power']),
        ]

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
            var gridEnergyValues: { [name: string]: number } = {}

            snapshot.device_snapshots.forEach((deviceSnapshot: any) => {
                if (
                    (deviceSnapshot.name === 'power' ||
                        deviceSnapshot.name === 'energy') &&
                    targetNames.includes(deviceSnapshot.name)
                ) {
                    if (!powerOrEnergyValues[deviceSnapshot.device_name]) {
                        powerOrEnergyValues[deviceSnapshot.device_name] = []
                    }
                    powerOrEnergyValues[deviceSnapshot.device_name].push(
                        deviceSnapshot.value ?? 0
                    )

                    homePowerConsumption += deviceSnapshot.value
                } else if (
                    deviceSnapshot.name === 'soc' &&
                    targetNames.includes(deviceSnapshot.name)
                ) {
                    if (!socValues[deviceSnapshot.device_name]) {
                        socValues[deviceSnapshot.device_name] = []
                    }
                    socValues[deviceSnapshot.device_name].push(
                        deviceSnapshot.value ?? 0
                    )
                } else if (
                    (deviceSnapshot.name === 'energy_import' ||
                        deviceSnapshot.name == 'energy_export') &&
                    targetNames.includes(deviceSnapshot.name)
                ) {
                    if (!gridEnergyValues[deviceSnapshot.device_name]) {
                        gridEnergyValues[deviceSnapshot.device_name] = 0
                    }

                    if (deviceSnapshot.name === 'energy_import') {
                        gridEnergyValues[deviceSnapshot.device_name] +=
                            deviceSnapshot.value ?? 0
                    } else {
                        gridEnergyValues[deviceSnapshot.device_name] -=
                            deviceSnapshot.value ?? 0
                    }
                }
            })

            Object.keys(gridEnergyValues).forEach(deviceName => {
                if (!powerOrEnergyValues[deviceName]) {
                    powerOrEnergyValues[deviceName] = []
                }

                homePowerConsumption += gridEnergyValues[deviceName]

                powerOrEnergyValues[deviceName].push(
                    gridEnergyValues[deviceName]
                )
            })

            const sortedDeviceSnapshots = snapshot.device_snapshots.sort(
                (n1: any, n2: any) => {
                    if (n1.device_name < n2.device_name) return -1
                    if (n1.device_name > n2.device_name) return 1
                    return 0
                }
            )

            this.devices()
                .filter(
                    device =>
                        sortedDeviceSnapshots
                            .filter((ds: any) => targetNames.includes(ds.name))
                            .map((ds: any) => ds.device_name)
                            .indexOf(device.name) === -1 &&
                        targetTypes.includes(device.type)
                )
                .forEach(device => {
                    if (!powerOrEnergyValues[device.name]) {
                        powerOrEnergyValues[device.name] = []
                    }
                    powerOrEnergyValues[device.name].push(0.0)

                    if (device.type === 'battery') {
                        if (!socValues[device.name]) {
                            socValues[device.name] = []
                        }

                        socValues[device.name].push(0.0)
                    }
                })

            if (!powerOrEnergyValues[translatedHomeName]) {
                powerOrEnergyValues[translatedHomeName] = []
            }
            powerOrEnergyValues[translatedHomeName].push(-homePowerConsumption)
        })

        this.powerOrEnergyValues.set(powerOrEnergyValues)
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
            this.powerOrEnergyValues.set({})
            this.socValues.set({})

            this.getSnapshotsSubscription = this.api
                .getSnapshots(
                    `${this.fromDate().getTime()}-${this.toDate().getTime()}${this.dataGrouping() !== undefined ? '?grouping=' + this.dataGrouping() : ''}`
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
                    devices.sort((a: any, b: any) => {
                        if (a.name < b.name) return -1
                        if (a.name > b.name) return 1
                        return 0
                    })
                )

                this.webserviceSubscription = this.websocket
                    .getMessage('snapshot:new')
                    .subscribe(data => {
                        this.addSnapshotsToChart(
                            [JSON.parse(data)],
                            'websocket'
                        )
                    })
            })
    }

    ngOnDestroy(): void {
        this.getDevicesSubscription?.unsubscribe()
        this.webserviceSubscription?.unsubscribe()
        this.getSnapshotsSubscription?.unsubscribe()
    }
}
