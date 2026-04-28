import { Setting } from '@/entities/settings.entity'
import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { getEntityManager } from './database'
import { validateIntegerInRange, validateIsNotEmpty } from '@/libs/validators'

export abstract class SettingChangeObserver {
    abstract getObservedSettings(): string[]

    abstract onSettingChange(setting: Setting): void
}

const _settingChangeObservers: SettingChangeObserver[] = []

export const SETTING_POLLING_RATE = 'polling_rate'
export const SETTING_SNAPSHOT_PERSISTANCE_INTERVAL =
    'snapshot_persistance_interval'

export const DEFAULT_POLLING_RATE = 10
export const DEFAULT_SETTING_SNAPSHOT_PERSISTANCE_INTERVAL = 5 * 60

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

                widget: {
                    formlyConfig: {
                        props: {
                            addonRight: {
                                text: 's',
                            },
                        },
                    },
                },
            },

            snapshot_persistance_interval: {
                title: '{{ settings.snapshotPersistanceInterval }}',
                type: 'number',
                minimum: 1,
                maximum: 200,
                default: DEFAULT_SETTING_SNAPSHOT_PERSISTANCE_INTERVAL,

                widget: {
                    formlyConfig: {
                        props: {
                            addonRight: {
                                text: 's',
                            },
                        },
                    },
                },
            },
        },

        required: ['polling_rate', 'snapshot_persistance_interval'],
    }
}

export function validateSettingsInput(settings: any): {
    [key: string]: string
} {
    return {
        ...validateIsNotEmpty('polling_rate', settings.polling_rate),
        ...validateIntegerInRange(
            'polling_rate',
            settings.polling_rate,
            1,
            200
        ),

        ...validateIsNotEmpty(
            'snapshot_persistance_interval',
            settings.snapshot_persistance_interval
        ),
        ...validateIntegerInRange(
            'snapshot_persistance_interval',
            settings.snapshot_persistance_interval,
            1,
            200
        ),
    }
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
