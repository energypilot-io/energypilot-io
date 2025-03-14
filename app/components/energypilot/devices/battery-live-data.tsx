import { ChartSplineIcon } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '~/components/ui/accordion'
import { useEffect, useState } from 'react'
import { formatEnergy, formatPower, useI18nFormat } from '~/lib/utils'
import { EnrichedDevice } from '~/routes/api_.devices'
import { useTranslation } from 'react-i18next'
import { useSocket } from '~/context'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'

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
import { Theme, useTheme } from 'remix-themes'

export type DeviceLiveDataProps = {
    device: EnrichedDevice
}

export function BatteryLiveData({ device }: DeviceLiveDataProps) {
    const { t } = useTranslation()
    const { format } = useI18nFormat()

    const socket = useSocket()

    const [theme] = useTheme()

    const [series, setSeries] = useState<any>([
        {
            type: 'line',
            name: t('consts.power'),
            smooth: true,
            symbol: 'none',
            data: [],
            datetimes: [],
            yAxisIndex: 0,
            tooltip: {
                valueFormatter: (value: number, dataIndex: number) => {
                    const formattedValue = formatPower(value)
                    return `${formattedValue?.value} ${formattedValue?.unit}`
                },
            },
        },

        {
            type: 'line',
            name: t('consts.soc'),
            smooth: true,
            symbol: 'none',
            data: [],
            datetimes: [],
            yAxisIndex: 1,
            tooltip: {
                valueFormatter: (value: number, dataIndex: number) => {
                    return `${value.toFixed(2)} %`
                },
            },
        },
    ])

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_LIVEDATA_UPDATED, (data) => {
            if (!Array.isArray(data)) return

            for (const element of data) {
                if (element.device.id === device.id) {
                    setSeries((oldSeries: any) => {
                        return [
                            {
                                ...oldSeries[0],
                                data: [
                                    ...oldSeries[0].data,
                                    Math.round(element.power),
                                ].slice(-10),

                                datetimes: [
                                    ...oldSeries[0].datetimes,
                                    element.created_at,
                                ].slice(-10),
                            },

                            {
                                ...oldSeries[1],
                                data: [...oldSeries[1].data, element.soc].slice(
                                    -10
                                ),

                                datetimes: [
                                    ...oldSeries[1].datetimes,
                                    element.created_at,
                                ].slice(-10),
                            },
                        ]
                    })
                    break
                }
            }
        })
    }, [socket])

    return (
        <Card>
            <CardContent className="px-4 py-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="live-data" className="border-none">
                        <AccordionTrigger>
                            <div className="flex gap-2">
                                <ChartSplineIcon />{' '}
                                {t('cards.deviceCard.liveData')}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-2">
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
                                grid={{
                                    left: '3%',
                                    right: '3%',
                                    bottom: '1%',
                                    containLabel: true,
                                }}
                                className="w-full min-h-72"
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
                                yAxis={[
                                    {
                                        type: 'value',
                                        name: t('consts.power'),
                                        axisLabel: {
                                            formatter: function (a: number) {
                                                const formatedPower =
                                                    formatPower(a)
                                                return `${formatedPower?.value} ${formatedPower?.unit}`
                                            },
                                        },
                                    },

                                    {
                                        type: 'value',
                                        name: t('consts.soc'),
                                        axisLabel: {
                                            formatter: function (a: number) {
                                                return `${a}%`
                                            },
                                        },
                                    },
                                ]}
                                xAxis={[
                                    {
                                        type: 'category',
                                        data: (
                                            series[0].datetimes as any[]
                                        ).map((item: Date) =>
                                            format(item, 'HH:mm:ss')
                                        ),
                                    },
                                ]}
                                series={series}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}
