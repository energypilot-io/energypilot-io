import { Component, inject, Input, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatExpansionModule } from '@angular/material/expansion'
import { ConfirmDialogComponent } from '../../dialog/confirm-dialog/confirm-dialog'
import { MatDialog } from '@angular/material/dialog'
import { ApiService } from '@/app/services/api.service'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { CreateDeviceComponent } from '../../dialog/create-device/create-device'
import { Subscription } from 'rxjs'
import { WebsocketService } from '@/app/services/websocket.service'
import { KeyValuePipe } from '@angular/common'
import { toEnergyString, toPowerString } from '@/app/libs/utils'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'

@Component({
    selector: 'app-device-info',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatExpansionModule,
        TranslatePipe,
        KeyValuePipe,
        NgxSkeletonLoaderModule,
    ],
    templateUrl: './device-info.html',
    styleUrl: './device-info.css',
})
export class DeviceInfoComponent {
    @Input() device: any = null

    private webserviceDeviceSubscription?: Subscription
    private webserviceSnapshotSubscription?: Subscription

    readonly dialog = inject(MatDialog)
    readonly api = inject(ApiService)
    readonly translate = inject(TranslateService)
    readonly websocket = inject(WebsocketService)

    isConnected = signal<boolean | undefined>(undefined)
    liveValues = signal<{ [key: string]: string } | undefined>(undefined)

    ngOnInit(): void {
        this.webserviceDeviceSubscription = this.websocket
            .getMessage('device:update')
            .subscribe(data => {
                JSON.parse(data).map((updatedDevice: any) => {
                    if (updatedDevice.id === this.device.id) {
                        this.isConnected.set(updatedDevice.connected)
                    }
                })
            })

        this.webserviceSnapshotSubscription =
            this.webserviceDeviceSubscription = this.websocket
                .getMessage('snapshot:new')
                .subscribe(data => {
                    const liveValues: { [key: string]: string } = {}

                    JSON.parse(data).device_snapshots.map((snapshot: any) => {
                        if (snapshot.device_id === this.device.id) {
                            if (snapshot.name.indexOf('energy') !== -1) {
                                liveValues[snapshot.name] = toEnergyString(
                                    snapshot.value
                                )
                            } else if (snapshot.name.indexOf('power') !== -1) {
                                liveValues[snapshot.name] = toPowerString(
                                    snapshot.value
                                )
                            } else if (snapshot.name.indexOf('soc') !== -1) {
                                liveValues[snapshot.name] =
                                    `${snapshot.value.toFixed(2)} %`
                            }
                        }
                    })

                    this.liveValues.set(liveValues)
                })
    }

    ngOnDestroy(): void {
        this.webserviceDeviceSubscription?.unsubscribe()
        this.webserviceSnapshotSubscription?.unsubscribe()
    }

    editDevice(): void {
        const dialogReg = this.dialog.open(CreateDeviceComponent, {
            disableClose: true,
            autoFocus: true,
            hasBackdrop: true,
            data: {
                id: this.device.id,
                device_name: this.device.name,
                device_type: this.device.type,
                device_model: {
                    device_model: this.device.model,
                    interface: {
                        interface: this.device.interface,
                        interfaceParameters: JSON.parse(this.device.properties),
                    },
                },
            },
        })

        dialogReg.afterClosed().subscribe(result => {
            if (result) window.location.reload()
        })
    }

    deleteDevice(): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            disableClose: true,
            autoFocus: true,
            hasBackdrop: true,
            data: {
                title: this.translate.instant('dialog.delete-device.title'),
                message: this.translate.instant(
                    'dialog.delete-device.message',
                    {
                        deviceName: this.device.name,
                    }
                ),
            },
        })

        dialogRef.afterClosed().subscribe(dialogResult => {
            if (dialogResult) {
                this.api.deleteDevice(this.device.id).subscribe(response => {
                    window.location.reload()
                })
            }
        })
    }
}
