import { FormlyExtension, FormlyFieldConfig } from '@ngx-formly/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable } from 'rxjs'

export class TranslateExtension implements FormlyExtension {
    constructor(private translate: TranslateService) {}
    prePopulate(field: FormlyFieldConfig) {
        const props = field.props || ({} as any)

        const regex = /{{([^}]+)}}/
        const match = regex.exec(props.label)

        if ((!match && field.type !== 'enum') || props._translated) {
            return
        }

        props._translated = true

        if (match) {
            field.expressions = {
                ...(field.expressions || {}),
                'props.label': this.translate.stream(match[1].trim()),
            }
        }

        if (field.type === 'enum' && field.props!.options) {
            field.props!.options = (field.props!.options as any[]).map(
                (option: any) => {
                    if (typeof option === 'object') {
                        const translationKey = `device.enumValues.${field.key}.${option.label}`
                        let translation = this.translate.instant(translationKey)

                        if (translation === translationKey) {
                            translation = option.label
                        }

                        return {
                            ...option,
                            label: translation,
                        }
                    } else {
                        return this.translate.instant(option)
                    }
                }
            )
        }
    }
}

export function registerTranslateExtension(translate: TranslateService) {
    return {
        validationMessages: [
            {
                name: 'required',
                message() {
                    return translate.stream('messages.validations.required')
                },
            },
            {
                name: 'other',
                message(err: any, field: FormlyFieldConfig) {
                    return translate.stream(err)
                },
            },
        ],
        extensions: [
            {
                name: 'translate',
                extension: new TranslateExtension(translate),
            },
        ],
    }
}
