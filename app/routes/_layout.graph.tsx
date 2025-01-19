import { useFetcher } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { Header } from '~/components/energypilot/site/header'

import { EChart } from '@kbox-labs/react-echarts'

import { LineChart } from 'echarts/charts'

import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DatasetComponent,
    DataZoomComponent,
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { formatPower } from '~/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { CalendarIcon, LoaderIcon } from 'lucide-react'
import { WS_EVENT_SNAPSHOT_CREATED } from 'server/constants'
import { useSocket } from '~/context'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'
import { Collection } from '@mikro-orm/core'
import { Snapshot } from 'server/database/entities/snapshot.entity'
import { Theme, useTheme } from 'remix-themes'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '~/components/ui/popover'
import { Button } from '~/components/ui/button'
import { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'
import { Calendar } from '~/components/ui/calendar'
import { cn } from '~/lib/utils'

export default function GraphPage() {
    const { t } = useTranslation()
    const [theme] = useTheme()
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

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(2022, 0, 20),
        to: addDays(new Date(2022, 0, 20), 20),
    })

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
        const groupedSoCValues: { [name: string]: number[] } = {}

        const nameHouse = t('liveEnergyCard.nodes.home')
        groupedValues[nameHouse] = []
        ;(fetcher.data as Snapshot[]).forEach((snapshot: Snapshot) => {
            let housePower = 0

            const deviceSnapshots: Collection<DeviceSnapshot> =
                snapshot.device_snapshots as Collection<DeviceSnapshot>

            // @ts-ignore
            deviceSnapshots.items.forEach((deviceSnapshot: DeviceSnapshot) => {
                const device_id =
                    deviceSnapshot.label ?? deviceSnapshot.device_id
                if (!(device_id in groupedValues)) {
                    groupedValues[device_id] = []
                }

                switch (deviceSnapshot.type) {
                    case 'pv':
                    case 'grid':
                        housePower += deviceSnapshot.power ?? 0
                        break

                    case 'battery':
                        if (!(device_id in groupedSoCValues)) {
                            groupedSoCValues[device_id] = []
                        }

                        groupedSoCValues[device_id].push(
                            deviceSnapshot.soc ?? 0
                        )
                    case 'consumer':
                        housePower -= deviceSnapshot.power ?? 0
                        break
                }

                groupedValues[device_id].push(deviceSnapshot.power ?? 0)
            })

            groupedValues[nameHouse].push(housePower)
        })

        setSeries([
            ...Object.keys(groupedValues).map((device_id) => {
                return {
                    name: device_id,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    data: groupedValues[device_id],
                    tooltip: {
                        valueFormatter: (value: number, dataIndex: number) => {
                            const formattedValue = formatPower(value)
                            return `${formattedValue?.value} ${formattedValue?.unit}`
                        },
                    },
                }
            }),

            ...Object.keys(groupedSoCValues).map((device_id) => {
                return {
                    name: `${device_id} SoC`,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    yAxisIndex: 1,
                    data: groupedSoCValues[device_id],
                    tooltip: {
                        valueFormatter: (value: number, dataIndex: number) => {
                            return `${value.toFixed(2)} %`
                        },
                    },
                }
            }),
        ])
    }, [fetcher.data])

    return (
        <>
            <Header
                breadcrumbs={[{ label: t('pages.graph.title'), link: '#' }]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-col gap-2">
                    <div className="flex">
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
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={'outline'}
                                    className={cn(
                                        'w-[300px] justify-start text-left font-normal',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, 'LLL dd, y')}{' '}
                                                - {format(date.to, 'LLL dd, y')}
                                            </>
                                        ) : (
                                            format(date.from, 'LLL dd, y')
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

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
                                        TooltipComponent,
                                        GridComponent,
                                        LineChart,
                                        CanvasRenderer,
                                        LegendComponent,
                                        DatasetComponent,
                                        DataZoomComponent,
                                    ]}
                                    className="w-full lg:min-h-[50vh] min-h-72"
                                    renderer={'canvas'}
                                    darkMode={theme === Theme.DARK}
                                    tooltip={{
                                        trigger: 'axis',
                                        triggerOn: 'mousemove',

                                        axisPointer: {
                                            type: 'cross',
                                            label: {
                                                backgroundColor: '#6a7985',
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
                                                    const formatedPower =
                                                        formatPower(a)
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