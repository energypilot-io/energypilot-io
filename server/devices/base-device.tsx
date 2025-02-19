import { IInterface } from 'server/interfaces/IInterface'
import { BaseDeviceTemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { Device } from 'server/database/entities/device.entity'
import { ChildLogger, getLogger } from 'server/core/logmanager'

export class BaseDevice {
    name: string

    protected _connector: IInterface
    protected _deviceDefinition: Device

    protected _logger: ChildLogger

    private _enabledParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        baseDeviceTemplateDef: Partial<BaseDeviceTemplateDef> = {},
        deviceDefinition: Device
    ) {
        this._connector = connector
        this._deviceDefinition = deviceDefinition

        this.name = this._deviceDefinition.name

        this._logger = getLogger(`${this._deviceDefinition.type}.${this.name}`)

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
