import { LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction } from '@remix-run/react'
import i18next from '~/lib/i18n.server'

import { useTranslation } from 'react-i18next'
import { DeviceGrid } from '~/components/energypilot/devices/device-grid'
import { UpsertDeviceDialog } from '~/components/energypilot/dialogs/upsert-device'
import { Header } from '~/components/energypilot/site/header'

export async function loader({ request }: LoaderFunctionArgs) {
    let t = await i18next.getFixedT(request)

    return {
        appName: t('app.name'),
        siteTitle: t('navigation.pages.settings.devices.title'),
    }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [{ title: `${data?.siteTitle} | ${data?.appName}` }]
}

export default function SettingsDevicesPage() {
    const { t } = useTranslation()

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.settings.title'), link: '#' },
                    {
                        label: t('navigation.pages.settings.devices.title'),
                        link: '#',
                    },
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex gap-2">
                    <UpsertDeviceDialog />
                </div>

                <DeviceGrid />
            </div>
        </>
    )
}
