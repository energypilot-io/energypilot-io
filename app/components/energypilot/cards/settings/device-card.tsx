import { Overlay } from '@radix-ui/react-alert-dialog'
import { Link, useFetcher } from '@remix-run/react'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { EnrichedDevice } from '~/routes/api_.devices'
import { UpsertDeviceDialog } from '../../dialogs/upsert-device'

export type DeviceCardProps = {
    device: EnrichedDevice
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
                            <Button
                                variant="ghost"
                                className=" text-red-600"
                                onClick={() => onHandleDelete()}
                                disabled={fetcher.state !== 'idle'}
                            >
                                {t('buttons.delete')}
                            </Button>
                            <AlertDialogCancel>
                                {t('buttons.cancel')}
                            </AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <CardHeader>
                    <CardTitle className="flex gap-2 items-center max-h-8">
                        {device.logo && (
                            <img
                                src={device.logo}
                                className="h-8 aspect-square rounded-lg"
                            />
                        )}
                        {device.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col">
                    <div>{device.template}</div>
                    <div className="flex justify-end items-center gap-2">
                        <Button
                            variant="ghost"
                            className=" text-red-600"
                            onClick={() => setShowAlert(true)}
                        >
                            {t('buttons.delete')}
                        </Button>

                        <UpsertDeviceDialog device={device} />
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
