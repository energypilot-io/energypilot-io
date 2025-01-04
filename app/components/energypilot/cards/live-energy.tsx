import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

import { useTranslation } from 'react-i18next'
import { EChart } from '@kbox-labs/react-echarts'

import { SankeyChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Theme, useTheme } from 'remix-themes'
import { useSocket } from '~/context'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import { formatPower } from '~/lib/utils'
import { CallbackDataParams } from 'echarts/types/dist/shared'

export function LiveEnergyCard() {
    const socket = useSocket()
    const fetcher = useFetcher()

    const [theme] = useTheme()

    const [data, setData] = useState<any>({ nodes: [], links: [] })

    const { t } = useTranslation()

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_LIVEDATA_UPDATED, () => {
            fetchData()
        })
    }, [socket])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = () => {
        fetcher.load('api/get-live-data')
    }

    useEffect(() => {
        if (!Array.isArray(fetcher.data)) return

        const dataset = fetcher.data[0]

        const nameHouse = t('liveEnergyCard.nodes.home')
        const nameBattery = t('liveEnergyCard.nodes.battery')
        const nameGrid = t('liveEnergyCard.nodes.grid')
        const nameSolar = t('liveEnergyCard.nodes.solar')

        const links = []
        const nodes = [
            {
                name: nameHouse,
                itemStyle: { color: '#2E8B57' },
            },
        ]

        if (
            (dataset.battery_charge_power !== null &&
                dataset.battery_charge_power > 0) ||
            (dataset.battery_discharge_power !== null &&
                dataset.battery_discharge_power > 0)
        ) {
            nodes.push({
                name: nameBattery,
                itemStyle: { color: '#00BFFF' },
            })

            if (
                dataset.battery_discharge_power !== null &&
                dataset.battery_discharge_power > 0
            ) {
                links.push({
                    source: nameBattery,
                    target: nameHouse,
                    value: dataset.battery_discharge_power,
                })
            }
        }

        if (dataset.grid_power !== null) {
            if (dataset.grid_power !== 0) {
                nodes.push({
                    name: nameGrid,
                    itemStyle: { color: '#708090' },
                })
            }

            if (dataset.grid_power > 0) {
                let grid_power = dataset.grid_power
                links.push({
                    source: nameGrid,
                    target: nameHouse,
                    value:
                        grid_power >= dataset.consumption
                            ? dataset.consumption
                            : grid_power,
                })

                grid_power -= dataset.consumption
                if (grid_power > 0 && dataset.battery_charge_power > 0) {
                    links.push({
                        source: nameGrid,
                        target: nameBattery,
                        value:
                            grid_power >= dataset.battery_charge_power
                                ? dataset.battery_charge_power
                                : grid_power,
                    })
                }
            }
        }

        if (dataset.pv_power !== null && dataset.pv_power > 0) {
            nodes.push({
                name: nameSolar,
                itemStyle: { color: '#FFC300' },
            })

            let pv_power = dataset.pv_power

            links.push({
                source: nameSolar,
                target: nameHouse,
                value:
                    pv_power >= dataset.consumption
                        ? dataset.consumption
                        : pv_power,
            })

            pv_power -= dataset.consumption
            if (pv_power > 0 && dataset.battery_charge_power > 0) {
                links.push({
                    source: nameSolar,
                    target: nameBattery,
                    value:
                        pv_power >= dataset.battery_charge_power
                            ? dataset.battery_charge_power
                            : pv_power,
                })
            }

            pv_power -= dataset.battery_charge_power
            if (pv_power > 0 && dataset.grid_power < 0) {
                links.push({
                    source: nameSolar,
                    target: nameGrid,
                    value: pv_power,
                })
            }
        }

        setData({ nodes: nodes, links: links })
    }, [fetcher.data])

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
                        SankeyChart,
                        CanvasRenderer,
                        TooltipComponent,
                        GridComponent,
                    ]}
                    className="w-full h-72"
                    darkMode={theme === Theme.DARK}
                    renderer={'canvas'}
                    tooltip={{
                        trigger: 'item',
                        triggerOn: 'mousemove',
                        formatter: (params) => {
                            params = params as CallbackDataParams

                            if (
                                params.value !== undefined &&
                                typeof params.value === 'number'
                            ) {
                                const formatedValue = formatPower(params.value)
                                return `${formatedValue?.value} ${formatedValue?.unit}`
                            }
                            return ''
                        },
                    }}
                    series={[
                        {
                            type: 'sankey',
                            data: data.nodes,
                            links: data.links,
                            emphasis: {
                                focus: 'adjacency',
                            },
                            lineStyle: {
                                curveness: 0.5,
                                color: 'gradient',
                            },
                        },
                    ]}
                />
            </CardContent>
        </Card>
    )
}
