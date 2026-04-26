import { Setting } from '@/entities/settings.entity'
import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { getEntityManager } from './database'

export abstract class SettingChangeObserver {
    abstract getObservedSettings(): string[]

    abstract onSettingChange(setting: Setting): void
}

const _settingChangeObservers: SettingChangeObserver[] = []

export const SETTING_POLLING_RATE = 'polling_rate'

export const DEFAULT_POLLING_RATE = 10

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
                default: DEFAULT_POLLING_RATE,
            },
        },

        required: ['device_name', 'device_type'],
    }
}

export function validateSettingsInput(settings: any): {
    [key: string]: string
} {
    let errors: { [key: string]: string } = {}

    try {
        if (!settings.polling_rate) {
            errors['polling_rate'] = 'messages.validations.required'
        } else if (
            Number.parseInt(settings.polling_rate) < 1 ||
            Number.parseInt(settings.polling_rate) > 200
        ) {
            errors['polling_rate'] = 'messages.validations.invalid_value'
        }
    } catch (error) {
        errors['polling_rate'] = 'messages.validations.invalid_value'
    }

    return errors
}

export function getSettingValue(name: string): Promise<string | null> {
    return getEntityManager()
        .findOne(Setting, { name })
        .then(setting => (setting ? setting.value : null))
}

export function registerSettingChangeObserver(observer: SettingChangeObserver) {
    _settingChangeObservers.push(observer)
}

export class SettingEventSubscriber implements EventSubscriber<Setting> {
    getSubscribedEntities() {
        return [Setting]
    }

    async afterCreate(args: EventArgs<Setting>): Promise<void> {
        this.notifyObservers(args.entity)
    }

    async afterUpdate(args: EventArgs<Setting>): Promise<void> {
        this.notifyObservers(args.entity)
    }

    async afterUpsert(args: EventArgs<Setting>): Promise<void> {
        this.notifyObservers(args.entity)
    }

    private notifyObservers(setting: Setting) {
        for (const observer of _settingChangeObservers) {
            if (observer.getObservedSettings().includes(setting.name)) {
                observer.onSettingChange(setting)
            }
        }
    }
}
