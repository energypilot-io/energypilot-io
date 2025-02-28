import { Overlay } from '@radix-ui/react-alert-dialog'
import { Link, useFetcher } from '@remix-run/react'
import {
    CircleCheckIcon,
    CircleIcon,
    CircleXIcon,
    TriangleAlert,
} from 'lucide-react'
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
import { Switch } from '~/components/ui/switch'

export type DeviceCardProps = {
    device: EnrichedDevice
}

export function DeviceCard({ device }: DeviceCardProps) {
    const { t } = useTranslation()

    const [showAlert, setShowAlert] = useState<boolean>(false)
    const fetcher = useFetcher()

    const [isEnabled, setIsEnabled] = useState<boolean>(device.is_enabled)

    function onHandleDelete() {
        fetcher.submit(
            {},
            {
                action: `/api/devices/${device.id}`,
                method: 'DELETE',
            }
        )
    }

    function onChangeEnableState(state: boolean) {
        if (state === undefined) return

        fetcher.submit(
            {
                isEnabled: state,
            },
            {
                action: `/api/devices/${device.id}`,
                method: 'POST',
                encType: 'application/json',
            }
        )

        setIsEnabled(state)
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
                                {t('messages.questions.deleteDevice.title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {t(
                                    'messages.questions.deleteDevice.description',
                                    {
                                        deviceName: device.name,
                                    }
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button
                                variant="ghost"
                                className=" text-red-600"
                                onClick={() => onHandleDelete()}
                                disabled={fetcher.state !== 'idle'}
                            >
                                {t('consts.buttons.delete')}
                            </Button>
                            <AlertDialogCancel>
                                {t('consts.buttons.cancel')}
                            </AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <div className="flex gap-2 items-center max-h-8">
                            {device.logo && (
                                <img
                                    src={device.logo}
                                    className="h-8 aspect-square rounded-lg"
                                />
                            )}
                            {device.name}
                        </div>

                        <div className="flex items-center">
                            {device.is_connected ? (
                                <CircleCheckIcon
                                    className="text-green-500"
                                    size={30}
                                />
                            ) : (
                                <CircleXIcon
                                    className="text-red-500"
                                    size={30}
                                />
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col">
                    <div>{device.template}</div>
                    <div className="flex justify-between items-center">
                        <Switch
                            id="device-enabled"
                            checked={isEnabled}
                            onCheckedChange={onChangeEnableState}
                            disabled={fetcher.state !== 'idle'}
                        />

                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className=" text-red-600"
                                onClick={() => setShowAlert(true)}
                            >
                                {t('consts.buttons.delete')}
                            </Button>

                            <UpsertDeviceDialog device={device} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
