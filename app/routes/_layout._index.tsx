import i18next from '~/lib/i18n.server'

import { useTranslation } from 'react-i18next'
import { EnergyExportCard } from '~/components/energypilot/cards/dashboard/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/dashboard/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/dashboard/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/dashboard/live-energy'
import { Header } from '~/components/energypilot/site/header'
import { LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction } from '@remix-run/react'

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

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.dashboard.title'), link: '#' },
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="grid auto-rows-min gap-4 lg:grid-cols-3 md:grid-cols-1">
                    <EnergyProductionCard />
                    <EnergyImportCard />
                    <EnergyExportCard />
                    <LiveEnergyCard />
                </div>
            </div>
        </>
    )
}
