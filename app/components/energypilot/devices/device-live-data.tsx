import { ChartSplineIcon, LoaderIcon } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '~/components/ui/accordion'
import { useEffect, useState } from 'react'
import { toEnergyString, toPowerString } from '~/lib/utils'
import { EnrichedDevice } from '~/routes/api_.devices'
import { useTranslation } from 'react-i18next'
import { useSocket } from '~/context'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import { Skeleton } from '~/components/ui/skeleton'

export type DeviceLiveDataProps = {
    device: EnrichedDevice
}

export function DeviceLiveData({ device }: DeviceLiveDataProps) {
    const { t } = useTranslation()

    const socket = useSocket()

    const [livePower, setLivePower] = useState<number | undefined>(undefined)
    const [liveEnergy, setLiveEnergy] = useState<number | undefined>(undefined)
    const [liveEnergyImport, setLiveEnergyImport] = useState<
        number | undefined
    >(undefined)
    const [liveEnergyExport, setLiveEnergyExport] = useState<
        number | undefined
    >(undefined)
    const [liveSoC, setLiveSoC] = useState<number | undefined>(undefined)

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_LIVEDATA_UPDATED, (data) => {
            if (!Array.isArray(data)) return

            for (const element of data) {
                if (element.device.id === device.id) {
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
                    break
                }
            }
        })
    }, [socket])

    return (
        <Card>
            <CardContent className="px-4 py-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="live-data" className="border-none">
                        <AccordionTrigger>
                            <div className="flex gap-2">
                                <ChartSplineIcon />{' '}
                                {t('cards.deviceCard.liveData')}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-2">
                            {livePower === undefined &&
                            liveEnergy === undefined &&
                            liveEnergyImport === undefined &&
                            liveEnergyExport === undefined &&
                            liveSoC === undefined ? (
                                <>
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </>
                            ) : (
                                <>
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
                                            {t('cards.deviceCard.energyImport')}
                                            : {toEnergyString(liveEnergyImport)}
                                        </div>
                                    )}

                                    {liveEnergyExport !== undefined && (
                                        <div>
                                            {t('cards.deviceCard.energyExport')}
                                            : {toEnergyString(liveEnergyExport)}
                                        </div>
                                    )}

                                    {liveSoC && (
                                        <div>
                                            {t('cards.deviceCard.soc')}:{' '}
                                            {liveSoC} %
                                        </div>
                                    )}
                                </>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}
