import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'

@Component({
    selector: 'app-create-device',
    imports: [MatButtonModule, MatDialogModule],
    templateUrl: './create-device.html',
    styleUrl: './create-device.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDeviceComponent {}
