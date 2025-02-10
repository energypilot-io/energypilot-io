import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

import { LoaderIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'

import { useTranslation } from 'react-i18next'
import { formatEnergy } from '~/lib/utils'
import { useSocket } from '~/context'
import { WS_EVENT_SNAPSHOT_CREATED } from 'server/constants'

export function EnergyExportCard() {
    const socket = useSocket()
    const fetcher = useFetcher()
    const { t } = useTranslation()

    const timeframes = [
        {
            days: '0',
            label: t('cards.energyImportCard.timeframes.today'),
        },
        {
            days: '7',
            label: t('cards.energyImportCard.timeframes.last7Days'),
        },
        {
            days: '30',
            label: t('cards.energyImportCard.timeframes.last30Days'),
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

        fetcher.load(`api/get-energy-export/${requestTimeframe.getTime()}`)
    }

    const onTimeframeSelected = (value: string) => {
        if (value !== '') setTimeframe(value)
    }

    const consumptionValue = Array.isArray(fetcher.data)
        ? formatEnergy(
              (fetcher.data as any[]).reduce(
                  (sum, current) => sum + current.energy_diff,
                  0
              )
          )
        : undefined

    const totalConsumptionValue = Array.isArray(fetcher.data)
        ? formatEnergy(
              (fetcher.data as any[]).reduce(
                  (sum, current) => sum + current.energy_total,
                  0
              )
          )
        : undefined

    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>{t('cards.energyExportCard.title')}</CardTitle>
                <CardDescription>
                    {t('cards.energyExportCard.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                {consumptionValue === undefined ? (
                    <LoaderIcon className="animate-spin" size={64} />
                ) : (
                    <div className="flex grow flex-col gap-2">
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

                        <div className="flex justify-end items-end gap-2">
                            <span className="text-8xl p-0 m-0">
                                {consumptionValue.value}
                            </span>
                            <span>{consumptionValue.unit}</span>
                        </div>

                        <div className="flex justify-end items-end gap-2">
                            <span>
                                {t('cards.energyImportCard.totalEnergy', {
                                    energy: `${totalConsumptionValue?.value} ${totalConsumptionValue?.unit}`,
                                })}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
