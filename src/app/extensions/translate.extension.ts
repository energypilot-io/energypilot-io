import { FormlyExtension, FormlyFieldConfig } from '@ngx-formly/core'
import { TranslateService } from '@ngx-translate/core'

export class TranslateExtension implements FormlyExtension {
    constructor(private translate: TranslateService) {}
    prePopulate(field: FormlyFieldConfig) {
        const props = field.props || ({} as any)

        const regex = /{{([^}]+)}}/
        const match = regex.exec(props.label)

        if (!match || props._translated) {
            return
        }

        props._translated = true
        field.expressions = {
            ...(field.expressions || {}),
            'props.label': this.translate.stream(match[1].trim()),
        }
    }
}

export function registerTranslateExtension(translate: TranslateService) {
    return {
        validationMessages: [
            {
                name: 'required',
                message() {
                    return translate.stream('FORM.VALIDATION.REQUIRED')
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
