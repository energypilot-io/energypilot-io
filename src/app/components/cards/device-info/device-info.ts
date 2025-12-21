import { Component, inject, Input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { ConfirmDialogComponent } from '../../dialog/confirm-dialog/confirm-dialog'
import { MatDialog } from '@angular/material/dialog'
import { ApiService } from '@/app/services/api.service'
import { TranslateService } from '@ngx-translate/core'
import { CreateDeviceComponent } from '../../dialog/create-device/create-device'

@Component({
    selector: 'app-device-info',
    imports: [MatCardModule, MatButtonModule, MatIconModule],
    templateUrl: './device-info.html',
    styleUrl: './device-info.css',
})
export class DeviceInfoComponent {
    @Input() device: any = null

    readonly dialog = inject(MatDialog)
    readonly api = inject(ApiService)
    readonly translate = inject(TranslateService)

    editDevice(): void {
        console.log('Edit device:', this.device)
        const dialogReg = this.dialog.open(CreateDeviceComponent, {
            disableClose: true,
            autoFocus: true,
            hasBackdrop: true,
            data: {
                device_name: this.device.name,
                device_type: this.device.type,
                device_model: {
                    device_model: this.device.model,
                    interface: {
                        interface: this.device.interface,
                        interfaceParameters: JSON.parse(this.device.properties),
                    }
                }
            },
        })

        dialogReg.afterClosed().subscribe(result => {
            this.api.sendData
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
