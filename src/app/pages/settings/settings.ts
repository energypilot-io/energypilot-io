import { ApiService } from '@/app/services/api.service'
import { Component, inject, signal } from '@angular/core'
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { TranslatePipe } from '@ngx-translate/core'
import _ from 'lodash'

@Component({
    selector: 'app-settings',
    imports: [ReactiveFormsModule, FormlyForm, TranslatePipe],
    templateUrl: './settings.html',
    styleUrl: './settings.scss',
})
export class SettingsPage {
    readonly api = inject(ApiService)

    model: any = {}

    fields = signal<FormlyFieldConfig[]>([])

    form = new FormGroup({})
    schema = signal<object>({})

    ngOnInit() {
        this.api.getSettingsSchema().subscribe(result => {
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
            if (ctrl instanceof FormGroup) {
                this.setErrorMessages(ctrl.controls, errors)
            } else if (errors[name]) {
                ctrl.setErrors({ other: errors[name] })
            }
        })
    }

    onSubmit(model: any) {
        this.api.sendSettings(model).subscribe({
            complete: () => {},
            error: (err: any) => {
                this.setErrorMessages(this.form.controls, err['error'])
            },
        })
    }
}
