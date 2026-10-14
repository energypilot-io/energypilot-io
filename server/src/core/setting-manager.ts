import { Setting } from '@/entities/settings.entity.js'
import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { getEntityManager } from './database-manager.js'
import {
    validateIntegerInRange,
    validateIsNotEmpty,
} from '@/libs/validators.js'
import { EntityManager } from '@mikro-orm/sqlite'
import { RegisteredModules } from './config.js'
import { SettingChangeObserver } from '@/observers/setting-change-observer.js'

const _settingChangeObservers: SettingChangeObserver[] = []

export const SETTING_POLLING_RATE = 'general.polling_rate'
export const SETTING_SNAPSHOT_PERSISTANCE_INTERVAL =
    'general.snapshot_persistance_interval'

export const DEFAULT_POLLING_RATE = 10
export const MIN_POLLING_RATE = 10
export const MAX_POLLING_RATE = 200

export const DEFAULT_SNAPSHOT_PERSISTANCE_INTERVAL = 5 * 60
export const MIN_SNAPSHOT_PERSISTANCE_INTERVAL = 60
export const MAX_SNAPSHOT_PERSISTANCE_INTERVAL = 60 * 60

export const SETTING_BACKUP_ENABLED = 'general.backup_enabled'
export const SETTING_BACKUP_RETENTION = 'general.backup_retention'

export const DEFAULT_BACKUP_ENABLED = true
export const DEFAULT_BACKUP_RETENTION = 7
export const MIN_BACKUP_RETENTION = 1

export async function initSettingManager() {}

export function getSettingSchema() {
    let settingGroups: { [groupName: string]: any } = {
        general: [
            {
                group: 'polling',
                schema: {
                    type: 'object',
                    properties: {
                        [SETTING_POLLING_RATE]: {
                            type: 'number',
                            minimum: MIN_POLLING_RATE,
                            maximum: MAX_POLLING_RATE,
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

                        [SETTING_SNAPSHOT_PERSISTANCE_INTERVAL]: {
                            type: 'number',
                            minimum: MIN_SNAPSHOT_PERSISTANCE_INTERVAL,
                            maximum: MAX_SNAPSHOT_PERSISTANCE_INTERVAL,
                            default: DEFAULT_SNAPSHOT_PERSISTANCE_INTERVAL,

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
                    required: [
                        SETTING_POLLING_RATE,
                        SETTING_SNAPSHOT_PERSISTANCE_INTERVAL,
                    ],
                },
            },

            {
                group: 'backup',
                schema: {
                    type: 'object',
                    properties: {
                        [SETTING_BACKUP_ENABLED]: {
                            type: 'boolean',
                            default: DEFAULT_BACKUP_ENABLED,
                        },

                        [SETTING_BACKUP_RETENTION]: {
                            type: 'number',
                            minimum: MIN_BACKUP_RETENTION,
                            default: DEFAULT_BACKUP_RETENTION,
                        },
                    },
                    required: [SETTING_BACKUP_RETENTION],
                },
            },
        ],
    }

    RegisteredModules.forEach(module => {
        const moduleSettings = module.getSettings((module as any).MODULE_NAME)
        if (moduleSettings) {
            settingGroups = { ...settingGroups, ...moduleSettings }
        }
    })

    return settingGroups
}

function getSettingProperties(
    settingGroup: string,
    settingName: string
): Record<string, unknown> | undefined {
    const settingGroups = getSettingSchema()[settingGroup] as
        | Array<{
              schema?: { properties?: Record<string, unknown> }
          }>
        | undefined

    return settingGroups
        ?.flatMap(group => Object.entries(group.schema?.properties ?? {}))
        .find(([name]) => name === `${settingGroup}.${settingName}`)?.[1] as
        Record<string, unknown> | undefined
}

export function isSecretSetting(
    settingGroup: string,
    settingName: string
): boolean {
    return getSettingProperties(settingGroup, settingName)?.secret === true
}

export function validateSettingsInput(
    settingGroup: string,
    settingName: string,
    value: unknown
): {
    [key: string]: string
} {
    const properties = getSettingProperties(settingGroup, settingName)

    const invalidValue = {
        [settingName]: 'messages.validations.invalid_value',
    }

    if (!properties) return invalidValue
    if (properties.secret === true && value === '') return {}

    if (properties.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return invalidValue
        }
        if (
            typeof properties.minimum === 'number' &&
            value < properties.minimum
        ) {
            return invalidValue
        }
        if (
            typeof properties.maximum === 'number' &&
            value > properties.maximum
        ) {
            return invalidValue
        }
    } else if (
        properties.type === 'string' &&
        (typeof value !== 'string' ||
            (typeof properties.minLength === 'number' &&
                value.length < properties.minLength) ||
            (typeof properties.maxLength === 'number' &&
                value.length > properties.maxLength) ||
            (typeof properties.pattern === 'string' &&
                !new RegExp(properties.pattern).test(value)))
    ) {
        return invalidValue
    } else if (properties.type === 'boolean' && typeof value !== 'boolean') {
        return invalidValue
    }

    return {}
}

export function validateSettingPollingRate(polling_rate: any): {
    [key: string]: string
} {
    return {
        ...validateIsNotEmpty('polling_rate', polling_rate),
        ...validateIntegerInRange(
            'polling_rate',
            polling_rate,
            MIN_POLLING_RATE,
            MAX_POLLING_RATE
        ),
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
            MIN_SNAPSHOT_PERSISTANCE_INTERVAL,
            MAX_SNAPSHOT_PERSISTANCE_INTERVAL
        ),
    }
}

export async function getSettingValue(
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
    const existingSettingValue = await getSettingValue(name)

    if (
        (existingSettingValue === null && value === null) ||
        (existingSettingValue ?? '').toString() === (value ?? '').toString()
    )
        return

    const setting = new Setting({
        name: name,
        value: value,
    })

    await (em || getEntityManager()).upsert(setting)
}

export async function registerSettingChangeObserver(
    observer: SettingChangeObserver
) {
    _settingChangeObservers.push(observer)

    for (const observedSetting of observer.getObservedSettings()) {
        const value = await getSettingValue(observedSetting)
        observer.onSettingChange(observedSetting, value)
    }
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
                observer.onSettingChange(setting.name, setting.value)
            }
        }
    }
}
