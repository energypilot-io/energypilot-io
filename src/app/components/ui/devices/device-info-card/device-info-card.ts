import { ApiService } from '@/app/services/api.service'
import { Component, inject, Input, signal } from '@angular/core'
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog'
import { DeviceForm } from '@/app/components/forms/device-form/device-form'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import {
    tablerBatteryVerticalCharging,
    tablerPlug,
    tablerSolarPanel2,
    tablerWavesElectricity,
    tablerChartBar,
    tablerTrash,
} from '@ng-icons/tabler-icons'

import { tablerCircleFill } from '@ng-icons/tabler-icons/fill'
import { BehaviorSubject, Subscription } from 'rxjs'
import { WebsocketService } from '@/app/services/websocket.service'
import { toEnergyString, toPowerString } from '@/app/libs/utils'
import { KeyValuePipe } from '@angular/common'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'

@Component({
    selector: 'app-device-info-card',
    imports: [
        NgIcon,
        KeyValuePipe,
        NgxSkeletonLoaderModule,
        TranslatePipe,
        NgbModule,
    ],
    templateUrl: './device-info-card.html',
    styleUrl: './device-info-card.scss',
    providers: [
        provideIcons({
            tablerBatteryVerticalCharging,
            tablerPlug,
            tablerSolarPanel2,
            tablerWavesElectricity,
            tablerCircleFill,
            tablerChartBar,
            tablerTrash,
        }),
    ],
})
export class DeviceInfoCard {
    @Input() device: any = null

    @Input() refreshToken?: BehaviorSubject<void> = undefined

    private readonly api = inject(ApiService)
    private readonly modalService = inject(NgbModal)
    private readonly websocket = inject(WebsocketService)
    private readonly translate = inject(TranslateService)

    private webserviceSnapshotSubscription?: Subscription

    liveValues = signal<{ [key: string]: string } | undefined>(undefined)

    ngOnInit() {
        this.webserviceSnapshotSubscription = this.websocket
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
        this.webserviceSnapshotSubscription?.unsubscribe()
    }

    editDevice(): void {
        const modalRef = this.modalService.open(DeviceForm, {
            centered: true,
            scrollable: true,
            backdrop: 'static',
        })
        modalRef.componentInstance.model = {
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
        }

        modalRef.result.then(result => {
            this.api
                .sendData({
                    id: result.id,
                    device_name: result.device_name,
                    device_type: result.device_type,
                    device_model: result.device_model.device_model,
                    interface: result.device_model.interface.interface,
                    interface_properties:
                        result.device_model.interface.interfaceParameters,
                })
                .subscribe(response => {
                    this.api.getDevice(this.device.id).subscribe(response => {
                        this.device = response
                    })
                })
        })
    }

    deleteDevice(): void {
        const modalRef = this.modalService.open(ConfirmDialog, {
            centered: true,
            backdrop: 'static',
        })
        modalRef.componentInstance.title = this.translate.instant(
            'dialogs.delete_device.title'
        )
        modalRef.componentInstance.message = this.translate.instant(
            'dialogs.delete_device.message',
            { device_name: this.device.name }
        )
        modalRef.componentInstance.description = this.translate.instant(
            'dialogs.delete_device.description'
        )
        modalRef.componentInstance.confirmText = this.translate.instant(
            'dialogs.delete_device.confirm_text'
        )

        modalRef.result.then(_result => {
            this.api.deleteDevice(this.device.id).subscribe(_response => {
                if (this.refreshToken) {
                    this.refreshToken.next()
                } else {
                    window.location.reload()
                }
            })
        })
    }
}
