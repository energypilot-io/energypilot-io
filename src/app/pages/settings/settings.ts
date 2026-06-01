import { ApiService } from '@/app/services/api.service'
import { ToastService } from '@/app/services/toast.service'
import { KeyValue, KeyValuePipe, NgTemplateOutlet } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { MarkdownModule, provideMarkdown } from 'ngx-markdown'

@Component({
    selector: 'app-settings',
    imports: [
        ReactiveFormsModule,
        FormlyForm,
        TranslatePipe,
        KeyValuePipe,
        NgTemplateOutlet,
        MarkdownModule,
    ],
    templateUrl: './settings.html',
    styleUrl: './settings.scss',
    providers: [provideMarkdown()],
})
export class SettingsPage {
    readonly api = inject(ApiService)
    readonly translate = inject(TranslateService)
    readonly toasts = inject(ToastService)
    readonly activatedRoute = inject(ActivatedRoute)

    private _settingGroupName = signal<string | undefined>(undefined)

    private _settingSchema = signal<any>(null)

    originalOrder = (
        _a: KeyValue<string, FormlyFieldConfig[]>,
        _b: KeyValue<string, FormlyFieldConfig[]>
    ): number => 0

    model: any = {}

    fields = computed<Map<string, FormlyFieldConfig[]>>(() => {
        if (!this._settingSchema() || !this._settingGroupName()) {
            return new Map<string, FormlyFieldConfig[]>()
        }

        const settingGroup = this._settingSchema()[this._settingGroupName()!]

        if (!Array.isArray(settingGroup)) {
            this.model = {}
            return new Map<string, FormlyFieldConfig[]>()
        }

        const fieldsByGroup: { [groupName: string]: FormlyFieldConfig[] } = {}

        settingGroup.forEach((settingGroup: any) => {
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
                                label: `{{ settings.${settingGroup.group}.${field.key.toString().split('.')[1]} }}`,
                            }
                        }

                        return field
                    },
                }),
            ]
        })

        this.api.getSettings().subscribe(settings => {
            if (Array.isArray(settings) || (settings = [])) {
                const model: { [key: string]: { [key: string]: any } } = {}

                settings
                    .filter((setting: any) =>
                        setting.name.startsWith(`${this._settingGroupName()!}.`)
                    )
                    .forEach((setting: any) => {
                        const [group, key] = setting.name.split('.')
                        if (!model[group]) {
                            model[group] = {}
                        }

                        const typedValue = this.getTypedSettingValue(
                            settingGroup,
                            setting
                        )

                        model[group][key] = typedValue
                    })

                this.model = model
            }
        })

        const sortedFieldsByGroup = new Map<string, FormlyFieldConfig[]>(
            Object.entries(fieldsByGroup).sort(([groupA], [groupB]) => {
                if (groupA.endsWith('.general')) {
                    return -1
                } else if (groupB.endsWith('.general')) {
                    return 1
                } else {
                    return groupA.localeCompare(groupB)
                }
            })
        )

        return sortedFieldsByGroup
    })

    form = new FormGroup({})

    constructor() {
        this.activatedRoute.paramMap.subscribe(params => {
            this._settingGroupName.set(params.get('group') || 'general')
        })
    }

    ngOnInit() {
        this.api.getSettingsSchema().subscribe(result => {
            if (!result) {
                return
            }

            this._settingSchema.set(result)
        })
    }

    getTypedSettingValue(
        schema: any,
        setting: { name: string; value: string | null }
    ): string | number | boolean | null {
        if (!Array.isArray(schema)) {
            return null
        }

        if (setting.value === undefined || setting.value === null) {
            return null
        }

        for (const settingGroup of schema) {
            if (!settingGroup.group || !settingGroup.schema) {
                continue
            }

            if (settingGroup.schema.properties?.[setting.name]?.type) {
                const settingType =
                    settingGroup.schema.properties[setting.name].type

                switch (settingType) {
                    case 'boolean':
                        return setting.value === '1'
                    case 'number':
                        return Number.parseFloat(setting.value || '')
                    case 'string':
                        return setting.value
                    default:
                        return null
                }
            }
        }

        return setting.value
    }

    setErrorMessages(
        controls: {
            [key: string]: AbstractControl<any>
        },
        errors: any
    ) {
        Object.entries(controls).forEach(([name, ctrl]) => {
            if (ctrl instanceof FormGroup) {
                this.setErrorMessages(ctrl.controls, errors)
            } else if (errors[name]) {
                ctrl.setErrors({ other: errors[name] })
            }
        })
    }

    onSubmit(model: any) {
        this.api.sendSettings(model).subscribe({
            complete: () => {
                this.form.markAsPristine()

                this.toasts.show({
                    body: this.translate.instant('messages.settings.success'),
                    class: 'text-bg-success',
                })
            },
            error: (err: any) => {
                this.form.markAsDirty()

                this.setErrorMessages(this.form.controls, err['error'])

                this.toasts.show({
                    body: this.translate.instant('messages.settings.error'),
                    class: 'text-bg-danger',
                })
            },
        })
    }
}
