import i18next from '~/lib/i18n.server'

import update from 'immutability-helper'
import { useTranslation } from 'react-i18next'
import { Header } from '~/components/energypilot/site/header'
import { LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction, useFetcher } from '@remix-run/react'
import { createElement, useCallback, useEffect } from 'react'
import { Card } from '~/components/ui/card'
import useState from 'react-usestateref'
import { Setting } from 'server/database/entities/setting.entity'
import { DASHBOARD_CARDS } from '~/lib/utils'

export async function loader({ request }: LoaderFunctionArgs) {
    let t = await i18next.getFixedT(request)

    return {
        appName: t('app.name'),
        siteTitle: t('navigation.pages.dashboard.title'),
    }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [{ title: `${data?.siteTitle} | ${data?.appName}` }]
}

export default function DashboardPage() {
    const { t } = useTranslation()
    const settingsFetcher = useFetcher()
    const settingsSubmitter = useFetcher()

    const [cards, setCards, cardsRef] = useState<string[]>([])

    const cardOrderSettingsKey = 'dashboard_cards_order'

    useEffect(() => {
        settingsFetcher.load(`/api/settings?q=${cardOrderSettingsKey}`)
    }, [])

    useEffect(() => {
        if (settingsFetcher.data === undefined) return

        let savedCardsOrder: string[] = []

        const fetchedSetting = settingsFetcher.data as Setting
        if (fetchedSetting?.key === cardOrderSettingsKey) {
            savedCardsOrder = JSON.parse(fetchedSetting.value)
        }

        setCards([
            ...savedCardsOrder,
            ...Object.keys(DASHBOARD_CARDS).filter(
                (value) => savedCardsOrder.indexOf(value) === -1
            ),
        ])
    }, [settingsFetcher.data])

    const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
        if (dragIndex === undefined || hoverIndex === undefined) return

        setCards((prevCards: string[]) =>
            update(prevCards, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevCards[dragIndex] as string],
                ],
            })
        )
    }, [])

    const endDrag = useCallback(() => {
        if (cardsRef.current === undefined || cardsRef.current.length === 0)
            return

        settingsSubmitter.submit(
            {
                [cardOrderSettingsKey]: JSON.stringify(cardsRef.current),
            },
            {
                method: 'POST',
                action: '/api/settings',
            }
        )
    }, [cards])

    const renderCard = useCallback((card: string, index: number) => {
        if (card === undefined || DASHBOARD_CARDS[card] === undefined) {
            return <Card key="empty"></Card>
        }

        return createElement(DASHBOARD_CARDS[card].class, {
            key: index,
            index: index,
            moveCard: moveCard,
            endDrag: endDrag,
            defaultVisibility: DASHBOARD_CARDS[card].defaultVisibility,
        })
    }, [])

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.dashboard.title'), link: '#' },
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="grid auto-rows-min gap-4 lg:grid-cols-3 md:grid-cols-1">
                    {cards.map((card, i) => renderCard(card, i))}
                </div>
            </div>
        </>
    )
}
