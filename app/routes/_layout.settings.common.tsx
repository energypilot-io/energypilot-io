import { useTranslation } from 'react-i18next'
import { DeviceGrid } from '~/components/energypilot/devices/device-grid'
import { UpsertDeviceDialog } from '~/components/energypilot/dialogs/upsert-device'
import { Header } from '~/components/energypilot/site/header'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export default function SettingsCommonPage() {
    const { t } = useTranslation()

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.settings.title'), link: '#' },
                    {
                        label: t('navigation.pages.settings.common.title'),
                        link: '#',
                    },
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <p className="font-bold">Data</p>
                <Label htmlFor="pollingFrequence">Polling Frequence</Label>
                <Input
                    id="pollingFrequence"
                    type="number"
                    className="max-w-72"
                />

                <div>
                    <Button>Save Settings</Button>
                </div>
            </div>
        </>
    )
}
