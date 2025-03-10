import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { LoaderIcon } from 'lucide-react'
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

    return (
        <MoveableCard
            type={type}
            index={index}
            moveCard={moveCard}
            endDrag={endDrag}
            title={t('cards.liveWeatherCard.title')}
        >
            <LoaderIcon className="animate-spin" size={64} />
        </MoveableCard>
    )
}
