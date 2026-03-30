import { DeviceForm } from '@/app/components/forms/device-form/device-form'
import { DeviceInfoCard } from '@/app/components/ui/devices/device-info-card/device-info-card'
import { ApiService } from '@/app/services/api.service'
import { Component, inject, signal } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'

@Component({
    selector: 'app-devices',
    imports: [DeviceInfoCard],
    templateUrl: './devices.html',
    styleUrl: './devices.scss',
})
export class DevicesPage {
    private readonly api = inject(ApiService)
    private readonly modalService = inject(NgbModal)

    private getDevicesSubscription?: Subscription

    devices = signal<any[]>([])

    openCreateDeviceDialog() {
        this.modalService.open(DeviceForm).result.then(result => {
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
                    console.log(response)

                    // this.matDialogRef.close(true)
                })
        })
    }

    ngOnInit() {
        this.getDevicesSubscription = this.api
            .getAllDevices()
            .subscribe(devices => {
                this.devices.set(
                    devices.sort((a: any, b: any) => {
                        if (a.name < b.name) return -1
                        if (a.name > b.name) return 1
                        return 0
                    })
                )
            })
    }

    ngOnDestroy(): void {
        this.getDevicesSubscription?.unsubscribe()
    }
}
