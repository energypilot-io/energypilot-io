import { ChildLogger, getLogger } from '@/core/log.manager'
import { registerSettingChangeObserver } from '@/core/setting.manager'
import { SettingChangeObserver } from '@/observers/setting-change.observer'

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
                    group: `${moduleName}_general`,
                    schema: {
                        type: 'object',
                        properties: {
                            [`${moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`]:
                                {
                                    type: 'boolean',
                                    default: false,
                                },
                        },
                    },
                },
            ],
        }

        return settings
    }

    abstract start(): void
    abstract stop(): void

    /*
     * SettingChangeObserver implementation
     */

    getObservedSettings(): string[] {
        return [
            `${this._moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`,
        ]
    }

    onSettingChange(name: string, value?: any): void {
        if (
            name ===
            `${this._moduleName}${ModuleBase.SETTING_MODULE_ENABLED_SUFFIX}`
        ) {
            this._enabled = value || this._enabled
            this._logger.info(
                `Module ${this._moduleName} ${this._enabled ? 'enabled' : 'disabled'}`
            )

            if (this._enabled) {
                this.start()
            } else {
                this.stop()
            }
        }
    }
}
