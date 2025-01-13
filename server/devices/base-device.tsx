import { IConnector } from 'server/connectors/IConnector'
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

        if (
            baseDeviceTemplateDef.enabled !== undefined &&
            this._connector.templateInterfaceKey in
                baseDeviceTemplateDef.enabled
        ) {
            this._enabledParameter = parseParameter(
                baseDeviceTemplateDef.enabled[
                    this._connector.templateInterfaceKey
                ],
                this._connector
            )
        }
    }

    public async isEnabled(): Promise<boolean> {
        if (this._enabledParameter === undefined) return true

        const value = await this._enabledParameter?.getValue()
        return value !== 0
    }
}
