import { ApiService } from '@/app/services/api.service'
import { WebsocketService } from '@/app/services/websocket.service'
import { Component, effect, inject } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

type DeviceValue = {
    deviceName: string
    value: number
    unit: string
    trend: string
}

@Component({
    selector: 'app-energy-live-values',
    imports: [],
    templateUrl: './energy-live-values.html',
    styleUrl: './energy-live-values.scss',
})
export class EnergyLiveValues {
    readonly api = inject(ApiService)
    readonly websocket = inject(WebsocketService)
    readonly translate = inject(TranslateService)

    private getFirstSnapshotsSubscription?: Subscription
    private webserviceSubscription?: Subscription

    deviceValues: DeviceValue[] = []

    private updateKPIValues(snapshot: any) {
        this.deviceValues = []

        snapshot.device_snapshots
            .filter((deviceSnapshot: any) => {
                return deviceSnapshot.name === 'soc'
            })
            .forEach((deviceSnapshot: any) => {
                this.deviceValues.push({
                    deviceName: deviceSnapshot.device_name,
                    value: deviceSnapshot.value,
                    unit: '%',
                    trend: 'stable',
                })
            })
    }

    // constructor() {
    //     effect(() => {
    //         this.getFirstSnapshotsSubscription = this.api
    //             .getSnapshots(
    //                 `${this.fromDate().getTime()}-${this.toDate().getTime()}/1`
    //             )
    //             .subscribe(snapshots => {
    //                 this.setBaseValues(snapshots[0])
    //             })
    //     })
    // }

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
