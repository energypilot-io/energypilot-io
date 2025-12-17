import { Component, inject, Input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { ConfirmDialogComponent } from '../../dialog/confirm-dialog/confirm-dialog'
import { MatDialog } from '@angular/material/dialog'
import { ApiService } from '@/app/services/api.service'
import { TranslateService } from '@ngx-translate/core'

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

    deleteDevice(): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
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
