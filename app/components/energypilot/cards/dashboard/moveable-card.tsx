import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'

import { EyeOffIcon, MenuIcon, MoveIcon } from 'lucide-react'
import { useDrag, useDrop } from 'react-dnd'
import type { Identifier, XYCoord } from 'dnd-core'
import { useFetcher } from '@remix-run/react'
import { cn } from '~/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '~/components/ui/tooltip'
import { useTranslation } from 'react-i18next'

export const DndItemTypes = {
    CARD: 'card',
}

export type MoveableCardDndProps = {
    type: string
    index: number
    moveCard: (dragIndex: number, hoverIndex: number) => void
    endDrag: () => void
}

export type MoveableCardProps = MoveableCardDndProps & {
    title: string
    description?: string
}

interface DragItem {
    index: number
    id: string
    type: string
}

export function MoveableCard({
    index,
    moveCard,
    endDrag,

    type,
    title,
    description,
    children,
}: PropsWithChildren<MoveableCardProps>) {
    const { t } = useTranslation()

    const ref = useRef<HTMLDivElement>(null)

    const settingsFetcher = useFetcher()

    const settingsKey = `card_${type}_is_visible`

    const [isVisible, setIsVisible] = useState<boolean>(false)

    useEffect(() => {
        settingsFetcher.load(`/api/settings?q=${settingsKey}`)
    }, [])

    useEffect(() => {
        if (!Array.isArray(settingsFetcher.data)) return

        for (const setting of settingsFetcher.data) {
            if (setting.key === settingsKey) {
                setIsVisible(setting.value === '1')
                return
            }
        }

        setIsVisible(true)
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

    drop(ref)

    return (
        <div
            ref={ref}
            style={{ opacity }}
            className={cn(!isVisible && 'hidden')}
        >
            <TooltipProvider>
                <Card className="bg-muted/50" ref={preview}>
                    <CardHeader className="relative">
                        <CardTitle>{title}</CardTitle>
                        {description && (
                            <CardDescription>{description}</CardDescription>
                        )}

                        <div className="flex gap-2 absolute right-2 top-1">
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
                                        {t('tooltips.visibility.setInvisible')}
                                    </p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger>
                                    <div ref={drag}>
                                        <MenuIcon
                                            className="text-gray-300 hover:text-gray-800 cursor-pointer"
                                            size={20}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('tooltips.moveCard')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {children}
                    </CardContent>
                </Card>
            </TooltipProvider>
        </div>
    )
}
