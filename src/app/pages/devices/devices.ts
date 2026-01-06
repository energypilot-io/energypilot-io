import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { Component, inject, signal } from '@angular/core'
import { ApiService } from '@/app/services/api.service'
import { Subscription } from 'rxjs'
import { DeviceInfoComponent } from '@/app/components/cards/device-info/device-info'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog'
import { CreateDeviceComponent } from '@/app/components/dialog/create-device/create-device'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-devices',
    imports: [
        DeviceInfoComponent,
        MatButtonModule,
        MatIconModule,
        TranslatePipe,
    ],
    templateUrl: './devices.html',
    styleUrl: './devices.css',
})
export class DevicesComponent {
    readonly api = inject(ApiService)
    readonly dialog = inject(MatDialog)

    private getDevicesSubscription?: Subscription

    devices = signal<any[]>([])

    openCreateDeviceDialog() {
        const dialogRef = this.dialog.open(CreateDeviceComponent, {
            disableClose: true,
            autoFocus: true,
            hasBackdrop: true,
            data: {},
        })

        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`)
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
