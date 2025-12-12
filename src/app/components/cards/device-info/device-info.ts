import { Component, Input } from '@angular/core'
import { MatCardModule } from '@angular/material/card'

@Component({
    selector: 'app-device-info',
    imports: [MatCardModule],
    templateUrl: './device-info.html',
    styleUrl: './device-info.css',
})
export class DeviceInfoComponent {
    @Input() device: any = null
}
