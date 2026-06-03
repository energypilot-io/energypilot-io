import { ChildLogger, getLogger } from '@/core/log.manager.js'
import { registerSettingChangeObserver } from '@/core/setting.manager.js'
import { SettingChangeObserver } from '@/observers/setting-change.observer.js'

export abstract class ModuleBase extends SettingChangeObserver {
    static SETTING_MODULE_ENABLED_SUFFIX = '.enabled'

    protected _moduleName: string

    protected _enabled: boolean = false

    protected _logger: ChildLogger

    constructor(moduleName: string) {
        super()

        this._moduleName = moduleName
        this._logger = getLogger(moduleName)

        registerSettingChangeObserver(this)
    }

    static getSettings(moduleName: string): any {
        const settings: any = {
            [moduleName]: [
                {
                    group: `${moduleName}.general`,
                    schema: {
                        type: 'object',
                        properties: {
                            [`${moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`]:
                                {
                                    type: 'boolean',
                                    default: false,
                                    widget: {
                                        formlyConfig: {
                                            props: {
                                                formCheck: 'switch',
                                            },
                                        },
                                    },
                                },
                        },
                    },
                },
            ],
        }

        return settings
    }

    abstract getModuleName(): string

    abstract start(): void
    abstract stop(): void

    getIsEnabled(): boolean {
        return this._enabled
    }

    /*
     * SettingChangeObserver implementation
     */

    getObservedSettings(): string[] {
        return [
            `${this._moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`,
        ]
    }

    onSettingChange(name: string, value?: any): boolean {
        if (
            name ===
            `${this._moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`
        ) {
            const parsedValue = value === '1' || value === 1 || value === true

            this._enabled = parsedValue
            this._logger.info(
                `Module ${this._moduleName} ${this._enabled ? 'enabled' : 'disabled'}`
            )

            if (this._enabled) {
                this.start()
            } else {
                this.stop()
            }
            return true
        }
        return false
    }
}
