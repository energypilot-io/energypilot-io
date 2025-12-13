import { Component, inject, Input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { ConfirmDialogComponent } from '../../dialog/confirm-dialog/confirm-dialog'
import { MatDialog } from '@angular/material/dialog'
import { ApiService } from '@/app/services/api.service'

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

    deleteDevice(): void {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Delete Device',
                message: `Are you sure you want to delete device "${this.device.name}"? This action cannot be undone.`,
            },
        })

        dialogRef.afterClosed().subscribe(dialogResult => {
            if (dialogResult) {
                this.api.deleteDevice(this.device.id).subscribe(response => {
                    console.log('Device deleted:', response)
                    // window.location.reload()
                })
            }
        })
    }
}
