import { Overlay } from '@radix-ui/react-alert-dialog'
import { Link, useFetcher } from '@remix-run/react'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Device } from 'server/database/entities/device.entity'
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

export type DeviceCardProps = {
    device: Device
}

export function DeviceCard({ device }: DeviceCardProps) {
    const { t } = useTranslation()

    const [showAlert, setShowAlert] = useState<boolean>(false)
    const fetcher = useFetcher()

    function onHandleDelete() {
        fetcher.submit(
            {},
            {
                action: `/api/devices/${device.id}`,
                method: 'DELETE',
            }
        )
    }

    useEffect(() => {
        if (fetcher.data === undefined) return
        const returnValues: { success?: boolean } = fetcher.data as any

        if (returnValues.success === true) setShowAlert(false)
    }, [fetcher.data])

    return (
        <>
            <Card className="bg-muted/50">
                <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
                    <Overlay />
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex gap-2">
                                <TriangleAlert className="text-red-600" />{' '}
                                {t('alerts.deleteDevice.title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('alerts.deleteDevice.description', {
                                    deviceName: device.name,
                                })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t('buttons.cancel')}
                            </AlertDialogCancel>
                            <Button
                                onClick={() => onHandleDelete()}
                                disabled={fetcher.state !== 'idle'}
                            >
                                {t('buttons.delete')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <CardHeader>
                    <CardTitle>{device.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col">
                    <p>sddsf</p>
                    <div className="flex justify-end items-center gap-2">
                        <Link
                            to="#"
                            className="text-red-600"
                            onClick={() => setShowAlert(true)}
                        >
                            Delete
                        </Link>
                        <Button>Edit</Button>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
