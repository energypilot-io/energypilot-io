import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Device } from 'server/database/entities/device.entity'
import { DeviceCard } from '../cards/settings/device-card'

export function DeviceGrid() {
    const fetcher = useFetcher()

    const [devices, setDevices] = useState<Device[]>([])

    useEffect(() => {
        fetcher.load(`/api/devices`)
    }, [])

    useEffect(() => {
        if (Array.isArray(fetcher.data)) {
            setDevices(fetcher.data)
        }
    }, [fetcher.data])

    return (
        <div className="grid auto-rows-min gap-4 lg:grid-cols-3 md:grid-cols-1">
            {devices.map((device, index) => (
                <DeviceCard key={index} device={device} />
            ))}
        </div>
    )
}
