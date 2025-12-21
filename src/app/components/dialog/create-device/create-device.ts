import { ApiService } from '@/app/services/api.service'
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'

@Component({
    selector: 'app-create-device',
    imports: [
        MatButtonModule,
        MatDialogModule,
        ReactiveFormsModule,
        FormlyForm,
    ],
    templateUrl: './create-device.html',
    styleUrl: './create-device.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDeviceComponent {
    readonly api = inject(ApiService)

    data = inject(MAT_DIALOG_DATA)

    fields = signal<FormlyFieldConfig[]>([])

    form = new FormGroup({})
    model: any = this.data || {}
    schema = signal<object>({})

    constructor(public matDialogRef: MatDialogRef<CreateDeviceComponent>) {
    }

    ngOnInit() {
        this.api.getData().subscribe(result => {
            this.fields.set([new FormlyJsonschema().toFieldConfig(result)])
            this.schema.set(result)
        })
    }

    onSubmit(model: any) {
        this.api.sendData({
            id: model.id,
            device_name: model.device_name,
            device_type: model.device_type,
            device_model: model.device_model.device_model,
            interface: model.device_model.interface.interface,
            interface_properties: model.device_model.interface.interfaceParameters
        }).subscribe(response => {
            console.log(response)

            this.matDialogRef.close(true)
        })
    }
}
