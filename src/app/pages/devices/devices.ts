import { DeviceForm } from '@/app/components/forms/device-form/device-form'
import { DeviceInfoCard } from '@/app/components/ui/devices/device-info-card/device-info-card'
import { ApiService } from '@/app/services/api.service'
import { Component, inject, signal } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subscription } from 'rxjs'

import { tablerPlus } from '@ng-icons/tabler-icons'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-devices',
    imports: [DeviceInfoCard, NgIcon, TranslatePipe],
    templateUrl: './devices.html',
    styleUrl: './devices.scss',
    providers: [
        provideIcons({
            tablerPlus,
        }),
    ],
})
export class DevicesPage {
    private readonly api = inject(ApiService)
    private readonly modalService = inject(NgbModal)

    private getDevicesSubscription?: Subscription

    devices = signal<any[]>([])

    openCreateDeviceDialog() {
        this.modalService
            .open(DeviceForm, {
                centered: true,
                scrollable: true,
                fullscreen: 'md',
                backdrop: 'static',
            })
            .result.then(result => {})
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
