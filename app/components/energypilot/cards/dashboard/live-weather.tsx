import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { CloudCogIcon, CloudDrizzleIcon, LoaderIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'

import { useTranslation } from 'react-i18next'
import { formatEnergy } from '~/lib/utils'
import { useSocket } from '~/context'
import { WS_EVENT_SNAPSHOT_CREATED } from 'server/constants'
import { MoveableCard, MoveableCardDndProps } from './moveable-card'

export type LiveWeatherCardProps = MoveableCardDndProps & {}

export function LiveWeatherCard({
    type = 'liveWeatherCard',
    index,
    endDrag,
    moveCard,
}: LiveWeatherCardProps) {
    const { t } = useTranslation()

    const data: any = []

    return (
        <MoveableCard
            type={type}
            index={index}
            moveCard={moveCard}
            endDrag={endDrag}
            title={t('cards.liveWeatherCard.title')}
        >
            {data === undefined ? (
                <LoaderIcon className="animate-spin" size={64} />
            ) : (
                <div className="flex flex-col justify-start w-full gap-4">
                    <div className="flex justify-between">
                        <div className="flex flex-col justify-between">
                            <p className="text-4xl font-bold">Kumhausen</p>
                            <p className="text-sm text-gray-600">
                                {new Date().toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-2 text-5xl">
                            <CloudDrizzleIcon size="3rem" />
                            20 °C
                        </div>
                    </div>

                    <div className="flex gap-4 justify-between">
                        <div className="flex flex-col items-center">
                            <p className="font-bold">Mon</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Thu</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Wed</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Wed</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Wed</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Wed</p>
                            <CloudCogIcon />
                            20 °C
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="font-bold">Wed</p>
                            <CloudCogIcon />
                            20 °C
                        </div>
                    </div>
                </div>
            )}
        </MoveableCard>
    )
}
