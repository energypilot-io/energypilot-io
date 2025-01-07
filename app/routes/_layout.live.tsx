import { useFetcher } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { Header } from '~/components/energypilot/ui/header'

import { EChart } from '@kbox-labs/react-echarts'

import { LineChart } from 'echarts/charts'

import {
    GridComponent,
    TooltipComponent,
    ToolboxComponent,
    TitleComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { formatEnergy } from '~/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { LoaderIcon } from 'lucide-react'
import { WS_EVENT_SNAPSHOT_CREATED } from 'server/constants'
import { useSocket } from '~/context'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'
import { Collection } from '@mikro-orm/core'
import { Snapshot } from 'server/database/entities/snapshot.entity'

export default function Page() {
    const { t } = useTranslation()

    const socket = useSocket()
    const fetcher = useFetcher()

    const [series, setSeries] = useState<any>()

    const timeframes = [
        {
            days: '0',
            label: t('energyProductionCard.timeframes.today'),
        },
        {
            days: '7',
            label: t('energyProductionCard.timeframes.last7Days'),
        },
        {
            days: '30',
            label: t('energyProductionCard.timeframes.last30Days'),
        },
    ]

    const [timeframe, setTimeframe] = useState<string>(timeframes[0].days)

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_SNAPSHOT_CREATED, () => {
            fetchData()
        })
    }, [socket])

    useEffect(() => {
        fetchData()
    }, [timeframe])

    const fetchData = () => {
        let requestTimeframe = new Date()
        requestTimeframe.setHours(0, 0, 0, 0)

        if (timeframe !== undefined) {
            const daysInMilliseconds =
                Number.parseFloat(timeframe) * 24 * 60 * 60 * 1000
            requestTimeframe.setTime(
                requestTimeframe.getTime() - daysInMilliseconds
            )
        }

        fetcher.load(`/api/get-snapshots/${requestTimeframe.getTime()}`)
    }

    const onTimeframeSelected = (value: string) => {
        if (value !== '') setTimeframe(value)
    }

    useEffect(() => {
        if (!Array.isArray(fetcher.data)) return

        const groupedValues: { [name: string]: number[] } = {}

        ;(fetcher.data as Snapshot[]).forEach((snapshot: Snapshot) => {
            ;(
                snapshot.device_snapshots as Collection<DeviceSnapshot>
            ).items.forEach((deviceSnapshot: DeviceSnapshot) => {
                const device_id =
                    deviceSnapshot.label ?? deviceSnapshot.device_id
                if (!(device_id in groupedValues)) {
                    groupedValues[device_id] = []
                }

                groupedValues[device_id].push(deviceSnapshot.power ?? 0)
            })

            /*

            {
                name: 'Consumption (W)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) => item.consumption
                ),
            },
            {
                name: 'Grid Power (W)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) => item.grid_power
                ),
            },
            {
                name: 'PV Power (W)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) => item.pv_power
                ),
            },
            {
                name: 'Battery Charge Power (W)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) =>
                        item.battery_charge_power
                ),
            },
            {
                name: 'Battery Discharge Power (W)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) =>
                        item.battery_discharge_power
                ),
            },
            {
                name: 'Battery SoC (%)',
                type: 'line',
                smooth: true,
                symbol: 'none',
                data: data.map(
                    (item: any) => item.battery_soc
                ),
                yAxisIndex: 1,
            },
        ]
        */
        })

        setSeries(
            Object.keys(groupedValues).map((device_id) => {
                return {
                    name: device_id,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    data: groupedValues[device_id],
                    tooltip: {
                        trigger: 'axis',
                        formatter: function (a: number) {
                            const formatedEnergy = formatEnergy(a)
                            return `${formatedEnergy?.value} ${formatedEnergy?.unit}`
                        },
                    },
                }
            })
        )
    }, [fetcher.data])

    return (
        <>
            <Header
                breadcrumbs={[{ label: t('pages.liveData.title'), link: '#' }]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-col gap-2">
                    <ToggleGroup
                        type="single"
                        className="justify-start"
                        onValueChange={onTimeframeSelected}
                        value={timeframe}
                    >
                        {timeframes.map((item, index) => (
                            <ToggleGroupItem key={index} value={item.days}>
                                {item.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>

                    <Card className="bg-muted/50">
                        <CardContent className="flex justify-center">
                            {fetcher.data === undefined ||
                            series === undefined ? (
                                <LoaderIcon
                                    className="animate-spin"
                                    size={64}
                                />
                            ) : (
                                <EChart
                                    use={[
                                        TitleComponent,
                                        TooltipComponent,
                                        GridComponent,
                                        LineChart,
                                        CanvasRenderer,
                                        ToolboxComponent,
                                        LegendComponent,
                                        DatasetComponent,
                                        DataZoomComponent,
                                    ]}
                                    className="w-full h-full min-h-[50vh]"
                                    renderer={'canvas'}
                                    tooltip={{
                                        trigger: 'axis',
                                    }}
                                    toolbox={{
                                        feature: {
                                            restore: {
                                                // yAxisIndex: false
                                            },
                                        },
                                    }}
                                    legend={{
                                        show: true,
                                    }}
                                    dataZoom={[
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
                                    ]}
                                    xAxis={[
                                        {
                                            type: 'category',
                                            data: (fetcher.data as any[]).map(
                                                (item: any) =>
                                                    item.created_at.toLocaleTimeString()
                                            ),
                                        },
                                    ]}
                                    yAxis={[
                                        {
                                            type: 'value',
                                            name: 'Power',
                                            axisLabel: {
                                                formatter: function (
                                                    a: number
                                                ) {
                                                    const formatedEnergy =
                                                        formatEnergy(a)
                                                    return `${formatedEnergy?.value} ${formatedEnergy?.unit}`
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
                                                formatter: function (
                                                    a: number
                                                ) {
                                                    return `${a}%`
                                                },
                                            },
                                        },
                                    ]}
                                    series={series}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
