import { Form } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { EnergyExportCard } from '~/components/energypilot/cards/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/live-energy'
import { Header } from '~/components/energypilot/ui/header'

export default function Page() {
    const { t } = useTranslation()

    return (
        <>
            <Header
                breadcrumbs={[{ label: t('pages.dashboard.title'), link: '#' }]}
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
