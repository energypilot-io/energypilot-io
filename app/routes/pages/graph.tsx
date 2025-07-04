import { MetaFunction, useFetcher } from 'react-router';
import { useTranslation } from 'react-i18next'
import { Header } from '~/components/energypilot/site/header'
import i18next from '~/lib/i18n.server'

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

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { formatPower, useI18nFormat } from '~/lib/utils'
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
import { Calendar } from '~/components/ui/calendar'
import { cn } from '~/lib/utils'
import { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
    let t = await i18next.getFixedT(request)

    return {
        appName: t('app.name'),
        siteTitle: t('navigation.pages.graph.title'),
    }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [{ title: `${data?.siteTitle} | ${data?.appName}` }]
}

export default function GraphPage() {
    const { t } = useTranslation()
    const { format } = useI18nFormat()

    const [theme] = useTheme()
    const socket = useSocket()

    const fetcher = useFetcher()

    const [series, setSeries] = useState<any>()

    const timeframes = [
        {
            days: '0',
            label: t('cards.energyProductionCard.timeframes.today'),
        },
        {
            days: '7',
            label: t('cards.energyProductionCard.timeframes.last7Days'),
        },
        {
            days: '30',
            label: t('cards.energyProductionCard.timeframes.last30Days'),
        },
    ]

    const [date, setDate] = useState<DateRange | undefined>(undefined)

    const [timeframe, setTimeframe] = useState<string | undefined>(
        timeframes[0].days
    )

    const fromTimeInMilliseconds = useRef<number | undefined>(undefined)

    const toTimeInMilliseconds = useRef<number | undefined>(undefined)

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_SNAPSHOT_CREATED, fetchData)

        return () => {
            socket.off(WS_EVENT_SNAPSHOT_CREATED, fetchData)
        }
    }, [socket])

    useEffect(() => {
        if (timeframe === undefined) return

        const requestTimeframe = new Date()
        requestTimeframe.setHours(0, 0, 0, 0)

        setSeries(undefined)
        setDate(undefined)
        fromTimeInMilliseconds.current =
            requestTimeframe.getTime() -
            Number.parseFloat(timeframe) * 24 * 60 * 60 * 1000
        toTimeInMilliseconds.current = undefined

        fetchData()
    }, [timeframe])

    useEffect(() => {
        if (date === undefined) return

        setSeries(undefined)
        setTimeframe(undefined)
        fromTimeInMilliseconds.current = date.from?.getTime()

        if (date.to !== undefined) {
            date.to.setHours(23, 59, 59, 999)
            toTimeInMilliseconds.current = date.to.getTime()
        } else {
            toTimeInMilliseconds.current = undefined
        }

        fetchData()
    }, [date])

    const fetchData = () => {
        if (fromTimeInMilliseconds.current === undefined) return

        console.log(
            `/api/snapshots?from=${fromTimeInMilliseconds.current}${
                toTimeInMilliseconds.current !== undefined
                    ? `&to=${toTimeInMilliseconds.current}`
                    : ''
            }`
        )

        fetcher.load(
            `/api/snapshots?from=${fromTimeInMilliseconds.current}${
                toTimeInMilliseconds.current !== undefined
                    ? `&to=${toTimeInMilliseconds.current}`
                    : ''
            }`
        )
    }

    const onTimeframeSelected = (value: string) => {
        if (value !== '') setTimeframe(value)
    }

    useEffect(() => {
        if (!Array.isArray(fetcher.data)) return

        const snapshots = fetcher.data as Snapshot[]

        const existingDevices: { [type: string]: string[] } = {
            grid: [],
            pv: [],
            battery: [],
            consumer: [],
        }

        snapshots.forEach((snapshot: Snapshot) => {
            const deviceSnapshots: Collection<DeviceSnapshot> =
                snapshot.device_snapshots as Collection<DeviceSnapshot>

            // @ts-ignore
            deviceSnapshots.items.forEach((deviceSnapshot: DeviceSnapshot) => {
                if (
                    existingDevices[deviceSnapshot.type].indexOf(
                        deviceSnapshot.device.name
                    ) === -1
                ) {
                    existingDevices[deviceSnapshot.type].push(
                        deviceSnapshot.device.name
                    )
                }
            })
        })

        const nameHouse = t('cards.liveEnergyCard.nodes.home')

        const groupedValues: { [name: string]: number[] } = {}
        const groupedSoCValues: { [name: string]: number[] } = {}

        Object.keys(existingDevices).map((type) => {
            existingDevices[type].forEach((deviceName) => {
                if (!(deviceName in groupedValues)) {
                    groupedValues[deviceName] = []
                }

                if (type === 'battery' && !(deviceName in groupedSoCValues)) {
                    groupedSoCValues[deviceName] = []
                }
            })
        })
        groupedValues[nameHouse] = []

        snapshots.forEach((snapshot: Snapshot) => {
            let housePower = 0

            const deviceSnapshots: Collection<DeviceSnapshot> =
                snapshot.device_snapshots as Collection<DeviceSnapshot>

            const foundDeviceNames: string[] = [nameHouse]

            // @ts-ignore
            deviceSnapshots.items.forEach((deviceSnapshot: DeviceSnapshot) => {
                switch (deviceSnapshot.type) {
                    case 'pv':
                    case 'grid':
                        housePower += deviceSnapshot.power ?? 0
                        break

                    case 'battery':
                        groupedSoCValues[deviceSnapshot.device.name].push(
                            deviceSnapshot.soc ?? 0
                        )
                    case 'consumer':
                        housePower -= deviceSnapshot.power ?? 0
                        break
                }

                groupedValues[deviceSnapshot.device.name].push(
                    deviceSnapshot.power ?? 0
                )

                foundDeviceNames.push(deviceSnapshot.device.name)
            })

            groupedValues[nameHouse].push(housePower)

            Object.keys(groupedValues).forEach((deviceName) => {
                if (foundDeviceNames.indexOf(deviceName) === -1) {
                    groupedValues[deviceName].push(0)
                }
            })

            Object.keys(groupedSoCValues).forEach((deviceName) => {
                if (foundDeviceNames.indexOf(deviceName) === -1) {
                    groupedSoCValues[deviceName].push(0)
                }
            })
        })

        setSeries([
            ...Object.keys(groupedValues).map((deviceName) => {
                return {
                    name: deviceName,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    data: groupedValues[deviceName],
                    tooltip: {
                        valueFormatter: (value: number, dataIndex: number) => {
                            const formattedValue = formatPower(value)
                            return `${formattedValue?.value} ${formattedValue?.unit}`
                        },
                    },
                }
            }),

            ...Object.keys(groupedSoCValues).map((deviceName) => {
                return {
                    name: `${deviceName} SoC`,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    yAxisIndex: 1,
                    data: groupedSoCValues[deviceName],
                    tooltip: {
                        valueFormatter: (value: number, dataIndex: number) => {
                            return `${value.toFixed(2)} %`
                        },
                    },
                }
            }),
        ])
    }, [fetcher.data])

    function onChangeDateRange(range?: DateRange) {
        setDate(range)
    }

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.graph.title'), link: '#' },
                ]}
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
                                    onSelect={onChangeDateRange}
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
                                    grid={{
                                        left: '1%',
                                        right: '1%',
                                        containLabel: true,
                                    }}
                                    animation={false}
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
                                                    `${item.created_at.toLocaleDateString()} ${format(
                                                        item.created_at,
                                                        'HH:mm'
                                                    )}`
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
