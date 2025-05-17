import { useFetcher } from 'react-router'
import { useEffect, useState } from 'react'
import { DeviceCard } from '../cards/settings/device-card'
import { EnrichedDevice } from '~/routes/api/devices/_index'
import { FrownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DeviceGrid() {
    const { t } = useTranslation()
    const fetcher = useFetcher()

    const [devices, setDevices] = useState<EnrichedDevice[]>([])

    useEffect(() => {
        fetcher.load(`/api/devices`)
    }, [])

    useEffect(() => {
        if (Array.isArray(fetcher.data)) {
            setDevices(fetcher.data)
        }
    }, [fetcher.data])

    if (devices.length === 0) {
        return (
            <div className="flex flex-col justify-self-center mx-auto py-4 text-2xl place-items-center gap-2">
                <FrownIcon size={40} />
                <p>{t('messages.info.noDevicesFound')}</p>
            </div>
        )
    }

    return (
        <div className="grid auto-rows-min gap-4 lg:grid-cols-2 md:grid-cols-1 xl:grid-cols-3">
            {devices.map((device, index) => (
                <DeviceCard key={index} device={device} />
            ))}
        </div>
    )
}
