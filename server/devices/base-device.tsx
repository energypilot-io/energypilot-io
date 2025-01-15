import { IConnector } from 'server/connectors/IConnector'
import { logging } from 'server/core/log-manager'
import { DeviceDef } from 'server/defs/configuration'
import { BaseDeviceTemplateDef, TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'

export const defaultDeviceConfig: DeviceDef = {
    id: '',
}

export class BaseDevice {
    id: string
    label?: string

    protected _connector: IConnector
    protected _configuration: DeviceDef

    protected _logger: logging.ChildLogger

    private _enabledParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        baseDeviceTemplateDef: Partial<BaseDeviceTemplateDef> = {}
    ) {
        this._connector = connector
        this._configuration = { ...defaultDeviceConfig, ...deviceDef }

        this.id = this._configuration.id
        this.label = this._configuration.label

        this._logger = logging.getLogger(
            `${this._configuration.type}.${this.id}`
        )

        this._enabledParameter = this.getParameter(
            baseDeviceTemplateDef,
            'enabled'
        )
    }

    public getParameter(baseDeviceTemplateDef: any, parameterName: string) {
        if (
            baseDeviceTemplateDef[parameterName] !== undefined &&
            this._connector.templateInterfaceKey in
                baseDeviceTemplateDef[parameterName]
        ) {
            return parseParameter(
                baseDeviceTemplateDef[parameterName][
                    this._connector.templateInterfaceKey
                ],
                this._connector
            )
        }

        return undefined
    }

    public async isEnabled(): Promise<boolean> {
        if (this._enabledParameter === undefined) return true

        const value = await this._enabledParameter?.getValue()
        return value !== undefined && value !== 0
    }
}
