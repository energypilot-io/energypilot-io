import { ApiService } from '@/app/services/api.service'
import { WebsocketService } from '@/app/services/websocket.service'
import { Component, effect, inject } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import {
    tablerArrowBigUpFill,
    tablerArrowBigUpLineFill,
    tablerArrowBigUpLinesFill,
    tablerArrowBigDownFill,
    tablerArrowBigDownLineFill,
    tablerArrowBigDownLinesFill,
    tablerCircleFill,
} from '@ng-icons/tabler-icons/fill'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { formatPower } from '@/app/libs/utils'

type DeviceValue = {
    id: string
    deviceName: string
    value: number
    formattedValue: string
    unit: string
    trend: number
}

@Component({
    selector: 'app-energy-live-values',
    imports: [NgIcon],
    templateUrl: './energy-live-values.html',
    styleUrl: './energy-live-values.scss',
    providers: [
        provideIcons({
            tablerArrowBigUpFill,
            tablerArrowBigDownFill,
            tablerCircleFill,
            tablerArrowBigUpLineFill,
            tablerArrowBigUpLinesFill,
            tablerArrowBigDownLineFill,
            tablerArrowBigDownLinesFill,
        }),
    ],
})
export class EnergyLiveValues {
    readonly api = inject(ApiService)
    readonly websocket = inject(WebsocketService)
    readonly translate = inject(TranslateService)

    private getFirstSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    deviceValues: DeviceValue[] = []

    private getDeviceValueEntry(
        id: number,
        name: string,
        deviceName: string,
        value: number
    ): DeviceValue {
        const existingDeviceValue = this.deviceValues.find(
            deviceValue => deviceValue.deviceName === deviceName
        )

        let formattedValue = ''
        let formattedUnit = ''
        let trend = existingDeviceValue ? value - existingDeviceValue.value : 0

        if (name === 'soc') {
            formattedValue = value.toLocaleString(
                this.translate.getCurrentLang(),
                {
                    maximumFractionDigits: 2,
                }
            )
            formattedUnit = '%'
        } else if (name === 'power') {
            const formatted = formatPower(value)

            formattedValue = formatted.value
            formattedUnit = formatted.unit
        }

        return {
            id: `${id}-${name}`,
            deviceName: deviceName,
            formattedValue: formattedValue,
            value: value,
            unit: formattedUnit,
            trend: trend,
        }
    }

    private updateKPIValues(snapshot: any) {
        const updatedDeviceValues: DeviceValue[] = []

        var homePowerConsumption = 0
        const translatedHomeName = this.translate.instant('devices.home')

        snapshot.device_snapshots
            .filter((deviceSnapshot: any) => {
                return (
                    deviceSnapshot.name === 'soc' ||
                    deviceSnapshot.name === 'power'
                    // (deviceSnapshot.device_type === 'grid' &&
                    //     deviceSnapshot.name === 'power')
                )
            })
            .forEach((deviceSnapshot: any) => {
                homePowerConsumption +=
                    deviceSnapshot.name === 'power' ? deviceSnapshot.value : 0

                updatedDeviceValues.push(
                    this.getDeviceValueEntry(
                        deviceSnapshot.device_id,
                        deviceSnapshot.name,
                        deviceSnapshot.device_name,
                        deviceSnapshot.value
                    )
                )
            })

        updatedDeviceValues.push(
            this.getDeviceValueEntry(
                -1,
                'power',
                translatedHomeName,
                homePowerConsumption
            )
        )

        this.deviceValues = updatedDeviceValues.sort((a, b) =>
            a.deviceName.localeCompare(b.deviceName)
        )
    }

    constructor() {
        effect(() => {
            this.getFirstSnapshotsSubscription = this.api
                .getSnapshots('latest')
                .subscribe(snapshots => {
                    this.updateKPIValues(snapshots[0])
                })
        })
    }

    ngOnInit() {
        this.webserviceSubscription = this.websocket
            .getMessage('snapshot:new')
            .subscribe(data => {
                this.updateKPIValues(JSON.parse(data))
            })
    }

    ngOnDestroy(): void {
        this.webserviceSubscription?.unsubscribe()
        this.getFirstSnapshotsSubscription?.unsubscribe()
    }
}
