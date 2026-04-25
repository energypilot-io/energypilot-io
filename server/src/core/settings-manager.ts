import { Setting } from '@/entities/settings.entity'
import { upsertEntity } from './database'
import { Transactional } from '@mikro-orm/decorators/legacy'

export async function initSettingsManager() {}

export function getSettingSchema() {
    return {
        type: 'object',
        properties: {
            polling_rate: {
                title: '{{ settings.pollingRate }}',
                type: 'number',
                minimum: 1,
                maximum: 200,
                default: 10,
            },
        },

        required: ['device_name', 'device_type'],
    }
}

export function validateSettingsInput(settings: any): {
    [key: string]: string
} {
    let errors: { [key: string]: string } = {}

    if (!settings.polling_rate) {
        errors['polling_rate'] = 'messages.validations.required'
    } else if (settings.polling_rate < 1 || settings.polling_rate > 200) {
        errors['polling_rate'] = 'messages.validations.invalid'
    }

    return errors
}
