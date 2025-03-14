import { useEffect, useRef, useState } from 'react'
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

import { EyeIcon, EyeOffIcon, MenuIcon } from 'lucide-react'
import { useDrag, useDrop } from 'react-dnd'
import type { Identifier } from 'dnd-core'
import { useFetcher } from '@remix-run/react'
import { DndItemTypes, MoveableCardDndProps } from './moveable-card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '~/components/ui/tooltip'
import { useTranslation } from 'react-i18next'
import { Setting } from 'server/database/entities/setting.entity'
import { DASHBOARD_CARDS } from '~/lib/utils'

export type MoveableCardProps = MoveableCardDndProps & {
    title: string
    description?: string
}

interface DragItem {
    index: number
    id: string
    type: string
}

export function SettingsMoveableCard({
    index,
    moveCard,
    endDrag,

    type,
    title,
    description,
}: MoveableCardProps) {
    const { t } = useTranslation()

    const ref = useRef<HTMLDivElement>(null)

    const settingsFetcher = useFetcher()

    const settingsKey = `card_${type}_is_visible`

    const [isVisible, setIsVisible] = useState<boolean>(false)

    useEffect(() => {
        settingsFetcher.load(`/api/settings?q=${settingsKey}`)
    }, [])

    useEffect(() => {
        if (
            settingsFetcher.data === null ||
            settingsFetcher.data === undefined
        ) {
            setIsVisible(DASHBOARD_CARDS[type]?.defaultVisibility ?? false)
            return
        }

        const fetchedSetting = settingsFetcher.data as Setting

        if (fetchedSetting.key === settingsKey) {
            setIsVisible(fetchedSetting.value === '1')
            return
        }
    }, [settingsFetcher.data])

    const [{ handlerId }, drop] = useDrop<
        DragItem,
        void,
        { handlerId: Identifier | null }
    >({
        accept: DndItemTypes.CARD,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            }
        },
        hover(item: DragItem, monitor) {
            if (!ref.current) {
                return
            }
            const dragIndex = item.index
            const hoverIndex = index

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return
            }

            moveCard(dragIndex, hoverIndex)

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex
        },
    })

    const [{ opacity }, drag, preview] = useDrag(() => ({
        type: DndItemTypes.CARD,
        collect: (monitor) => ({
            opacity: monitor.isDragging() ? 0.4 : 1,
        }),

        end(draggedItem, monitor) {
            endDrag()
        },
    }))

    function toggleVisibility() {
        setIsVisible((isVisible) => {
            settingsFetcher.submit(
                {
                    [settingsKey]: isVisible ? '0' : '1',
                },
                {
                    method: 'POST',
                    action: '/api/settings',
                }
            )

            return !isVisible
        })
    }

    drag(drop(ref))

    return (
        <div ref={ref} style={{ opacity }}>
            <TooltipProvider>
                <Card className="bg-muted/50" ref={preview}>
                    <CardHeader className="relative flex-row gap-4 items-center">
                        <MenuIcon className="cursor-move" />
                        <div className="flex flex-col space-y-1.5">
                            <CardTitle>{title}</CardTitle>
                            {description && (
                                <CardDescription>{description}</CardDescription>
                            )}
                        </div>

                        <div className="flex gap-2 absolute right-2 top-1">
                            {isVisible ? (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <EyeIcon
                                            className="text-gray-300 hover:text-gray-800 cursor-pointer"
                                            size={20}
                                            onClick={() => toggleVisibility()}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {t(
                                                'tooltips.visibility.setInvisible'
                                            )}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <EyeOffIcon
                                            className="text-gray-300 hover:text-gray-800 cursor-pointer"
                                            size={20}
                                            onClick={() => toggleVisibility()}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {t(
                                                'tooltips.visibility.setVisible'
                                            )}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </CardHeader>
                </Card>
            </TooltipProvider>
        </div>
    )
}
