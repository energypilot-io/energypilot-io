import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

import { useTranslation } from 'react-i18next'
import { EChart } from '@kbox-labs/react-echarts'

import { SankeyChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { useEffect, useState } from 'react'
import { Theme, useTheme } from 'remix-themes'
import { useSocket } from '~/context'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import { formatPower } from '~/lib/utils'
import { CallbackDataParams } from 'echarts/types/dist/shared'

export function LiveEnergyCard() {
    const socket = useSocket()

    const [theme] = useTheme()

    const [data, setData] = useState<any>({ nodes: [], links: [] })

    const { t } = useTranslation()

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_LIVEDATA_UPDATED, (data) => {
            if (!Array.isArray(data)) return

            let gridPower: number = 0
            let batteryPower: number = 0
            let pvPower: number = 0

            let consumers: { name: string; value: number }[] = []

            data.forEach((element: any) => {
                switch (element.type) {
                    case 'grid':
                        gridPower += element.power
                        break

                    case 'battery':
                        batteryPower += element.power
                        break

                    case 'pv':
                        pvPower += element.power
                        break

                    case 'consumer':
                        if (element.power > 0) {
                            consumers.push({
                                name: element.label ?? element.device_id,
                                value: element.power,
                            })
                        }
                        break

                    default:
                        break
                }
            })

            createData(gridPower, batteryPower, pvPower, consumers)
        })
    }, [socket])

    function processConsumers(
        consumers: { name: string; value: number }[],
        links: { source: string; target: string; value: number }[],
        source: string,
        power: number
    ) {
        if (power > 0) {
            consumers = consumers.map(
                (consumer: { name: string; value: number }) => {
                    if (consumer.value <= 0 || power === 0) return consumer

                    links.push({
                        source: source,
                        target: consumer.name,
                        value: power >= consumer.value ? consumer.value : power,
                    })

                    let consumerResult
                    if (power >= consumer.value) {
                        consumerResult = 0
                        power -= consumer.value
                    } else {
                        consumerResult = consumer.value - power
                        power = 0
                    }

                    return { name: consumer.name, value: consumerResult }
                }
            )
        }

        return { consumers, power }
    }

    function createData(
        gridPower: number,
        batteryPower: number,
        pvPower: number,
        consumers: { name: string; value: number }[]
    ) {
        const housePower =
            gridPower +
            pvPower -
            batteryPower -
            consumers.reduce((sum, current) => sum + current.value, 0)

        const nameHouse = t('liveEnergyCard.nodes.home')
        const nameBattery = t('liveEnergyCard.nodes.battery')
        const nameGrid = t('liveEnergyCard.nodes.grid')
        const nameSolar = t('liveEnergyCard.nodes.solar')

        const links: { source: string; target: string; value: number }[] = []
        const nodes: { name: string; value: number; itemStyle?: any }[] = [
            {
                name: nameHouse,
                itemStyle: { color: '#2E8B57' },
                value: housePower,
            },
        ]

        consumers.forEach((consumer: { name: string; value: number }) => {
            nodes.push(consumer)
        })

        if (batteryPower !== 0) {
            nodes.push({
                name: nameBattery,
                itemStyle: { color: '#00BFFF' },
                value: Math.abs(batteryPower),
            })

            if (batteryPower < 0) {
                let { consumers: updatedConsumers, power } = processConsumers(
                    consumers,
                    links,
                    nameBattery,
                    Math.abs(batteryPower)
                )

                batteryPower = power * -1
                consumers = updatedConsumers

                if (batteryPower < 0) {
                    links.push({
                        source: nameBattery,
                        target: nameHouse,
                        value: Math.abs(batteryPower),
                    })
                }
            }
        }

        if (pvPower > 0) {
            nodes.push({
                name: nameSolar,
                itemStyle: { color: '#FFC300' },
                value: pvPower,
            })

            let { consumers: updatedConsumers, power } = processConsumers(
                consumers,
                links,
                nameSolar,
                pvPower
            )
            pvPower = power
            consumers = updatedConsumers

            if (pvPower > 0) {
                links.push({
                    source: nameSolar,
                    target: nameHouse,
                    value: pvPower >= housePower ? housePower : pvPower,
                })
                pvPower -= housePower
            }

            if (pvPower > 0 && batteryPower > 0) {
                links.push({
                    source: nameSolar,
                    target: nameBattery,
                    value: pvPower >= batteryPower ? batteryPower : pvPower,
                })
                pvPower -= batteryPower
            }

            if (pvPower > 0 && gridPower < 0) {
                links.push({
                    source: nameSolar,
                    target: nameGrid,
                    value: pvPower,
                })
            }
        }

        if (gridPower !== 0) {
            nodes.push({
                name: nameGrid,
                itemStyle: { color: '#708090' },
                value: Math.abs(gridPower),
            })

            if (gridPower > 0) {
                let { consumers: updatedConsumers, power } = processConsumers(
                    consumers,
                    links,
                    nameGrid,
                    gridPower
                )
                gridPower = power
                consumers = updatedConsumers

                if (gridPower > 0 && batteryPower > 0) {
                    links.push({
                        source: nameGrid,
                        target: nameBattery,
                        value:
                            gridPower >= batteryPower
                                ? batteryPower
                                : gridPower,
                    })
                    gridPower -= batteryPower
                }

                if (gridPower > 0) {
                    links.push({
                        source: nameGrid,
                        target: nameHouse,
                        value: gridPower >= housePower ? housePower : gridPower,
                    })
                }
            }
        }

        setData({ nodes: nodes, links: links })
    }

    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>{t('liveEnergyCard.title')}</CardTitle>
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
                                return `${params.name}: ${formatedValue?.value} ${formatedValue?.unit}`
                            }
                            return ''
                        },
                    }}
                    series={[
                        {
                            type: 'sankey',
                            data: data.nodes,
                            links: data.links,
                            draggable: false,
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
