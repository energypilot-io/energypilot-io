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

import { getEntityManager } from '~/lib/db.server'
import { Energy } from 'server/database/entities/energy.entity'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { formatEnergy } from '~/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { LoaderIcon } from 'lucide-react'
import { WS_EVENT_LIVEDATA_UPDATED } from '~/lib/constants'
import { useSocket } from '~/context'

export const loader = async () => {
    const energyEntities = await getEntityManager().findAll(Energy)
    return energyEntities
}

export default function Page() {
    const { t } = useTranslation()

    const socket = useSocket()
    const fetcher = useFetcher()

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

        socket.on(WS_EVENT_LIVEDATA_UPDATED, () => {
            fetchData()
        })
    }, [socket])

    useEffect(() => {
        fetchData()
    }, [timeframe])

    const fetchData = () => {
        let requestTimeframe = new Date()
        requestTimeframe.setHours(0, 0, 0, 0)

        console.log(timeframe)

        if (timeframe !== undefined) {
            const daysInMilliseconds =
                Number.parseFloat(timeframe) * 24 * 60 * 60 * 1000
            requestTimeframe.setTime(
                requestTimeframe.getTime() - daysInMilliseconds
            )
        }

        fetcher.load(`/api/get-historical-data/${requestTimeframe.getTime()}`)
    }

    const onTimeframeSelected = (value: string) => {
        if (value !== '') setTimeframe(value)
    }

    const data = fetcher.data as any

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
                            {data === undefined || data === null ? (
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
                                            top: 400,
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
                                            data: data.map((item: any) =>
                                                item.createdAt.toLocaleTimeString()
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
                                    series={[
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
                                    ]}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
