import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

import { useTranslation } from 'react-i18next'
import { EChart } from '@kbox-labs/react-echarts'

import { GaugeChart } from 'echarts/charts'

import {
    GridComponent,
    LegendComponent,
    DatasetComponent,
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'
import { useFetcher } from '@remix-run/react'
import { useInterval } from '~/lib/utils'
import { useEffect } from 'react'

export function LiveEnergyCard() {
    const { t } = useTranslation()

    const fetcher = useFetcher()

    useInterval(() => fetchData(), 10000)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = () => {
        fetcher.load('api/get-live-data')
    }

    const currentConsumption = Array.isArray(fetcher.data)
        ? fetcher.data[0].consumption
        : 0

    const currentProduction = Array.isArray(fetcher.data)
        ? fetcher.data[0].pv_power
        : 0

    const gridPower = Array.isArray(fetcher.data)
        ? fetcher.data[0].grid_power
        : 0

    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>{t('liveEnergyCard.title')}</CardTitle>
                <CardDescription>
                    {t('energyImportCard.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <EChart
                    use={[
                        GridComponent,
                        GaugeChart,
                        CanvasRenderer,
                        LegendComponent,
                        DatasetComponent,
                    ]}
                    className="aspect-square w-full"
                    renderer={'canvas'}
                    legend={{
                        show: true,
                    }}
                    series={[
                        {
                            type: 'gauge',
                            startAngle: -135,
                            endAngle: -45,
                            min: 0,
                            max: Math.max(
                                currentConsumption,
                                currentProduction,
                                gridPower
                            ),
                            pointer: {
                                show: false,
                            },
                            progress: {
                                show: true,
                                overlap: false,
                                roundCap: true,
                                clip: false,
                                itemStyle: {
                                    borderWidth: 1,
                                    borderColor: '#464646',
                                },
                            },
                            axisLine: {
                                lineStyle: {
                                    width: 40,
                                },
                            },
                            splitLine: {
                                show: false,
                                distance: 0,
                                length: 10,
                            },
                            axisTick: {
                                show: false,
                            },
                            axisLabel: {
                                show: false,
                                distance: 50,
                            },
                            data: [
                                {
                                    value: currentConsumption,
                                    name: 'Consumption',
                                    title: {
                                        offsetCenter: ['0%', '-30%'],
                                    },
                                    detail: {
                                        valueAnimation: true,
                                        offsetCenter: ['0%', '-20%'],
                                    },
                                },
                                {
                                    value: currentProduction,
                                    name: 'PV Power',
                                    title: {
                                        offsetCenter: ['0%', '0%'],
                                    },
                                    detail: {
                                        valueAnimation: true,
                                        offsetCenter: ['0%', '10%'],
                                    },
                                },
                                {
                                    value: gridPower,
                                    name: 'Grid',
                                    title: {
                                        offsetCenter: ['0%', '30%'],
                                    },
                                    detail: {
                                        valueAnimation: true,
                                        offsetCenter: ['0%', '40%'],
                                    },
                                },
                            ],
                            title: {
                                fontSize: 14,
                            },
                            detail: {
                                width: 50,
                                height: 14,
                                fontSize: 14,
                                color: 'inherit',
                                borderColor: 'inherit',
                                borderRadius: 20,
                                borderWidth: 1,
                                formatter: '{value} kW',
                            },
                        },
                    ]}
                />
            </CardContent>
        </Card>
    )
}
