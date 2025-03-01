import { Overlay } from '@radix-ui/react-alert-dialog'
import { useFetcher } from '@remix-run/react'
import {
    ChartSplineIcon,
    CircleCheckIcon,
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
import { useSocket } from '~/context'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '~/components/ui/accordion'
import { toEnergyString, toPowerString } from '~/lib/utils'

export type DeviceCardProps = {
    device: EnrichedDevice
}

export function DeviceCard({ device }: DeviceCardProps) {
    const socket = useSocket()

    const { t } = useTranslation()

    const [showAlert, setShowAlert] = useState<boolean>(false)
    const fetcher = useFetcher()

    const [currentDevice, setCurrentDevice] = useState<EnrichedDevice>(device)
    const [isEnabled, setIsEnabled] = useState<boolean>(
        currentDevice.is_enabled
    )

    const [livePower, setLivePower] = useState<number | undefined>(undefined)
    const [liveEnergy, setLiveEnergy] = useState<number | undefined>(undefined)
    const [liveEnergyImport, setLiveEnergyImport] = useState<
        number | undefined
    >(undefined)
    const [liveEnergyExport, setLiveEnergyExport] = useState<
        number | undefined
    >(undefined)
    const [liveSoC, setLiveSoC] = useState<number | undefined>(undefined)

    function onHandleDelete() {
        fetcher.submit(
            {},
            {
                action: `/api/devices/${currentDevice.id}`,
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
                action: `/api/devices/${currentDevice.id}`,
                method: 'POST',
                encType: 'application/json',
            }
        )

        setIsEnabled(state)
    }

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_LIVEDATA_UPDATED, (data) => {
            if (!Array.isArray(data)) return

            for (const element of data) {
                if (element.device.id === currentDevice.id) {
                    setLivePower(Math.round(element.power))

                    switch (element.device.type) {
                        case 'grid':
                            setLiveEnergyImport(
                                Math.round(element.energy_import)
                            )
                            setLiveEnergyExport(
                                Math.round(element.energy_export)
                            )
                            break

                        case 'pv':
                        case 'consumer':
                            setLiveEnergy(Math.round(element.energy))
                            break

                        case 'battery':
                            setLiveSoC(Math.round(element.soc))
                            break
                    }

                    setCurrentDevice({
                        ...currentDevice,
                        ...element.device,
                    } as EnrichedDevice)
                    break
                }
            }
        })
    }, [socket])

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
                                        deviceName: currentDevice.name,
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
                            {currentDevice.logo && (
                                <img
                                    src={currentDevice.logo}
                                    className="h-8 aspect-square rounded-lg"
                                />
                            )}
                            {currentDevice.name}
                        </div>

                        <div className="flex items-center">
                            {currentDevice.is_connected ? (
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
                <CardContent className="flex flex-col gap-4">
                    <div>{currentDevice.template}</div>

                    <Card>
                        <CardContent className="px-4 py-0">
                            <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                            >
                                <AccordionItem
                                    value="live-data"
                                    className="border-none"
                                >
                                    <AccordionTrigger>
                                        <div className="flex gap-2">
                                            <ChartSplineIcon />{' '}
                                            {t('cards.deviceCard.liveData')}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-2">
                                        {livePower !== undefined && (
                                            <div>
                                                {t('cards.deviceCard.power')}:{' '}
                                                {toPowerString(livePower)}
                                            </div>
                                        )}

                                        {liveEnergy !== undefined && (
                                            <div>
                                                {t('cards.deviceCard.energy')}:{' '}
                                                {toEnergyString(liveEnergy)}
                                            </div>
                                        )}

                                        {liveEnergyImport !== undefined && (
                                            <div>
                                                {t(
                                                    'cards.deviceCard.energyImport'
                                                )}
                                                :{' '}
                                                {toEnergyString(
                                                    liveEnergyImport
                                                )}
                                            </div>
                                        )}

                                        {liveEnergyExport !== undefined && (
                                            <div>
                                                {t(
                                                    'cards.deviceCard.energyExport'
                                                )}
                                                :{' '}
                                                {toEnergyString(
                                                    liveEnergyExport
                                                )}
                                            </div>
                                        )}

                                        {liveSoC && (
                                            <div>
                                                {t('cards.deviceCard.soc')}:{' '}
                                                {liveSoC} %
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

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

                            <UpsertDeviceDialog device={currentDevice} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
