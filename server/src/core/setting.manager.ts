import { Setting } from '@/entities/settings.entity'
import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { getEntityManager } from './database'
import { validateIntegerInRange, validateIsNotEmpty } from '@/libs/validators'
import { EntityManager } from '@mikro-orm/sqlite'

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

export const SETTING_TELEGRAM_BOT_TOKEN = 'telegram_bot_token'

export const ALLOWED_SETTINGS = [
    SETTING_POLLING_RATE,
    SETTING_SNAPSHOT_PERSISTANCE_INTERVAL,
    SETTING_TELEGRAM_BOT_TOKEN,
]

export async function initSettingManager() {}

export function getSettingSchema() {
    return [
        {
            group: 'polling',
            schema: {
                type: 'object',
                properties: {
                    polling_rate: {
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
                        type: 'number',
                        minimum: 1 * 60,
                        maximum: 60 * 60,
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
            },
        },

        {
            group: 'telegram_bot',
            schema: {
                type: 'object',
                properties: {
                    telegram_bot_token: {
                        type: 'string',
                        minLength: 1,
                        default: '',
                    },
                },
            },
        },
    ]
}

export function validateSettingsInput(settings: any): {
    [key: string]: string
} {
    return {
        ...validateSettingPollingRate(settings.polling_rate),
        ...validateSettingSnapshotPersistenceInterval(
            settings.snapshot_persistance_interval
        ),
    }
}

export function validateSettingPollingRate(polling_rate: any): {
    [key: string]: string
} {
    return {
        ...validateIsNotEmpty('polling_rate', polling_rate),
        ...validateIntegerInRange('polling_rate', polling_rate, 1, 200),
    }
}

export function validateSettingSnapshotPersistenceInterval(
    snapshot_persistance_interval: any
): {
    [key: string]: string
} {
    return {
        ...validateIsNotEmpty(
            'snapshot_persistance_interval',
            snapshot_persistance_interval
        ),
        ...validateIntegerInRange(
            'snapshot_persistance_interval',
            snapshot_persistance_interval,
            1 * 60,
            60 * 60
        ),
    }
}

export function getSettingValue(
    name: string
): Promise<string | null | undefined> {
    return getEntityManager()
        .findOne(Setting, { name })
        .then(setting => setting?.value)
}

export async function setSettingValue(
    name: string,
    value: string | null,
    em?: EntityManager
): Promise<void> {
    const setting = new Setting({
        name: name,
        value: value,
    })

    await (em || getEntityManager()).upsert(setting)
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
