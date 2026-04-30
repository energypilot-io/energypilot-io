import { ApiService } from '@/app/services/api.service'
import { KeyValuePipe, NgTemplateOutlet } from '@angular/common'
import { Component, inject, signal } from '@angular/core'
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { TranslatePipe } from '@ngx-translate/core'
import _ from 'lodash'

@Component({
    selector: 'app-settings',
    imports: [
        ReactiveFormsModule,
        FormlyForm,
        TranslatePipe,
        KeyValuePipe,
        NgTemplateOutlet,
    ],
    templateUrl: './settings.html',
    styleUrl: './settings.scss',
})
export class SettingsPage {
    readonly api = inject(ApiService)

    model: any = {}

    // fields = signal<FormlyFieldConfig[]>([])

    fields = signal<{ [groupName: string]: FormlyFieldConfig[] }>({})

    form = new FormGroup({})
    // schema = signal<object>({})

    ngOnInit() {
        this.api.getSettingsSchema().subscribe(result => {
            if (!result || !Array.isArray(result) || result.length === 0) {
                return
            }

            const fieldsByGroup: { [groupName: string]: FormlyFieldConfig[] } =
                {}

            result.forEach((settingGroup: any) => {
                if (!settingGroup.group || !settingGroup.schema) {
                    return
                }

                fieldsByGroup[settingGroup.group] = [
                    new FormlyJsonschema().toFieldConfig(settingGroup.schema, {
                        map: (field: FormlyFieldConfig, schema: any) => {
                            if (schema.props?.type) {
                                field.props = {
                                    ...field.props,
                                    type: schema.props.type,
                                }
                            }

                            if (field.key) {
                                field.props = {
                                    ...field.props,
                                    label: `{{ settings.${settingGroup.group}.${field.key} }}`,
                                }
                            }

                            return field
                        },
                    }),
                ]
            })

            this.fields.set(fieldsByGroup)

            this.api.getSettings().subscribe(settings => {
                if (Array.isArray(settings) || (settings = [])) {
                    const model: { [key: string]: any } = {}

                    settings.forEach((setting: any) => {
                        model[setting.name] = setting.value
                    })

                    this.model = model
                }
            })
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
        console.log('Submitting settings:', model)

        return

        this.api.sendSettings(model).subscribe({
            complete: () => {},
            error: (err: any) => {
                this.setErrorMessages(this.form.controls, err['error'])
            },
        })
    }
}
