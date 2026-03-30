import { ApiService } from '@/app/services/api.service'
import { Component, inject, Input, signal } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-device-form',
    imports: [ReactiveFormsModule, FormlyForm, TranslatePipe],
    templateUrl: './device-form.html',
    styleUrl: './device-form.scss',
})
export class DeviceForm {
    model: any = {}

    readonly api = inject(ApiService)
    readonly modal = inject(NgbActiveModal)

    fields = signal<FormlyFieldConfig[]>([])

    form = new FormGroup({})
    schema = signal<object>({})

    ngOnInit() {
        this.api.getData().subscribe(result => {
            this.fields.set([new FormlyJsonschema().toFieldConfig(result)])
            this.schema.set(result)
        })
    }

    onSubmit(model: any) {
        this.api
            .sendData({
                id: model.id,
                device_name: model.device_name,
                device_type: model.device_type,
                device_model: model.device_model.device_model,
                interface: model.device_model.interface.interface,
                interface_properties:
                    model.device_model.interface.interfaceParameters,
            })
            .subscribe(response => {
                console.log(response)

                // this.matDialogRef.close(true)
            })
    }
}
