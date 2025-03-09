import i18next from '~/lib/i18n.server'

import update from 'immutability-helper'
import { useTranslation } from 'react-i18next'
import { EnergyExportCard } from '~/components/energypilot/cards/dashboard/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/dashboard/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/dashboard/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/dashboard/live-energy'
import { Header } from '~/components/energypilot/site/header'
import { LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction, useFetcher } from '@remix-run/react'
import { useCallback, useEffect } from 'react'
import { Card } from '~/components/ui/card'
import { DEFAULT_DASHBOARD_CARDS_ORDER } from 'server/constants'
import useState from 'react-usestateref'

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

    const [cards, setCards, cardsRef] = useState<string[]>([])

    const cardOrderSettingsKey = 'dashboard_cards_order'

    useEffect(() => {
        settingsFetcher.load(`/api/settings?q=${cardOrderSettingsKey}`)
    }, [])

    useEffect(() => {
        if (!Array.isArray(settingsFetcher.data)) return

        for (const setting of settingsFetcher.data) {
            if (setting.key === cardOrderSettingsKey) {
                setCards(JSON.parse(setting.value))
                return
            }
        }

        setCards(DEFAULT_DASHBOARD_CARDS_ORDER)
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

        settingsFetcher.submit(
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
        if (card === undefined) return <Card key="empty"></Card>

        switch (card) {
            case 'energyProductionCard':
                return (
                    <EnergyProductionCard
                        type={card}
                        key={index}
                        index={index}
                        moveCard={moveCard}
                        endDrag={endDrag}
                    />
                )

            case 'energyImportCard':
                return (
                    <EnergyImportCard
                        type={card}
                        key={index}
                        index={index}
                        moveCard={moveCard}
                        endDrag={endDrag}
                    />
                )

            case 'energyExportCard':
                return (
                    <EnergyExportCard
                        type={card}
                        key={index}
                        index={index}
                        moveCard={moveCard}
                        endDrag={endDrag}
                    />
                )

            case 'liveEnergyCard':
                return (
                    <LiveEnergyCard
                        type={card}
                        key={index}
                        index={index}
                        moveCard={moveCard}
                        endDrag={endDrag}
                    />
                )
        }
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
