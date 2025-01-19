import { Form } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { EnergyExportCard } from '~/components/energypilot/cards/dashboard/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/dashboard/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/dashboard/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/dashboard/live-energy'
import { DeviceGrid } from '~/components/energypilot/devices/device-grid'
import { NewDeviceDialog } from '~/components/energypilot/dialogs/new-device'
import { Header } from '~/components/energypilot/site/header'
import { Button } from '~/components/ui/button'

export default function SettingsDevicesPage() {
    const { t } = useTranslation()

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('pages.settings.title'), link: '#' },
                    { label: t('pages.settings.devices.title'), link: '#' },
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex gap-2">
                    <NewDeviceDialog />
                </div>

                <DeviceGrid />
            </div>
        </>
    )
}
