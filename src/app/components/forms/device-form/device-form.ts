import { ApiService } from '@/app/services/api.service'
import { Component, inject, Input, signal } from '@angular/core'
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { TranslatePipe } from '@ngx-translate/core'
import _ from 'lodash'

@Component({
    selector: 'app-device-form',
    imports: [ReactiveFormsModule, FormlyForm, TranslatePipe],
    templateUrl: './device-form.html',
    styleUrl: './device-form.scss',
})
export class DeviceForm {
    readonly api = inject(ApiService)
    readonly modal = inject(NgbActiveModal)

    model: any = {}

    fields = signal<FormlyFieldConfig[]>([])

    form = new FormGroup({})
    schema = signal<object>({})

    ngOnInit() {
        this.api.getData().subscribe(result => {
            this.fields.set([
                new FormlyJsonschema().toFieldConfig(result, {
                    map: (field: FormlyFieldConfig, schema: any) => {
                        if (schema.props?.type) {
                            field.props = {
                                ...field.props,
                                type: schema.props.type,
                            }
                        }

                        return field
                    },
                }),
            ])
            this.schema.set(result)
        })
    }

    setErrorMessages(
        controls: {
            [key: string]: AbstractControl<any>
        },
        errors: any
    ) {
        _.forEach(controls, (ctrl: AbstractControl, name: string) => {
            console.log(name)
            if (ctrl instanceof FormGroup) {
                this.setErrorMessages(ctrl.controls, errors)
            } else if (errors[name]) {
                ctrl.setErrors({ other: errors[name] })
            }
        })
    }

    onSubmit(model: any) {
        console.log(this.form.valid)
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
            .subscribe({
                complete: () => {
                    this.modal.close(model)
                },
                error: (err: any) => {
                    this.setErrorMessages(this.form.controls, err['error'])
                },
            })
    }
}
