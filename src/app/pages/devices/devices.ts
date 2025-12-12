import { Component, inject, signal } from '@angular/core'
import { ApiService } from '@/app/services/api.service'
import { Subscription } from 'rxjs'

@Component({
    selector: 'app-devices',
    imports: [],
    templateUrl: './devices.html',
    styleUrl: './devices.css',
})
export class DevicesComponent {
    private api = inject(ApiService)

    private getDevicesSubscription?: Subscription

    devices = signal<any[]>([])

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
