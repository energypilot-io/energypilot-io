import i18next from '~/lib/i18n.server'
import update from 'immutability-helper'

import { LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction, useFetcher } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { Header } from '~/components/energypilot/site/header'
import { useCallback, useEffect } from 'react'
import { SettingsMoveableCard } from '~/components/energypilot/cards/dashboard/settings-moveable-card'
import useState from 'react-usestateref'
import { Setting } from 'server/database/entities/setting.entity'
import { DASHBOARD_CARDS } from 'server/constants'

export async function loader({ request }: LoaderFunctionArgs) {
    let t = await i18next.getFixedT(request)

    return {
        appName: t('app.name'),
        siteTitle: t('navigation.pages.settings.dashboard.title'),
    }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [{ title: `${data?.siteTitle} | ${data?.appName}` }]
}

export default function SettingsDashboardPage() {
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

    const moveCard = (dragIndex: number, hoverIndex: number) => {
        if (dragIndex === undefined || hoverIndex === undefined) return

        setCards((prevCards: string[]) =>
            update(prevCards, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevCards[dragIndex] as string],
                ],
            })
        )
    }

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

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.settings.title'), link: '#' },
                    {
                        label: t('navigation.pages.settings.dashboard.title'),
                        link: '#',
                    },
                ]}
            />

            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <p className="font-bold">
                    {t(`settings.dashboard.cards.label`)}
                </p>
                <div className="flex flex-col gap-2">
                    {cards.map((card, index) => (
                        <SettingsMoveableCard
                            type={card}
                            key={index}
                            moveCard={moveCard}
                            endDrag={endDrag}
                            index={index}
                            title={t(`cards.${card}.title`)}
                            description={t(
                                `cards.${card}.description`,
                                undefined
                            )}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}
