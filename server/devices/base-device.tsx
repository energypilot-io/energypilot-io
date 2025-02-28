import { IInterface } from 'server/interfaces/IInterface'
import { BaseDeviceTemplateDef } from 'server/defs/template'
import { parseParameter } from 'templates/template-parser'
import { Device } from 'server/database/entities/device.entity'
import { ChildLogger, getLogger } from 'server/core/logmanager'

export class BaseDevice {
    deviceDefinition: Device

    protected _connector: IInterface

    protected _logger: ChildLogger

    constructor(connector: IInterface, deviceDefinition: Device) {
        this._connector = connector
        this.deviceDefinition = deviceDefinition

        this._logger = getLogger(
            `${this.deviceDefinition.type}.${this.deviceDefinition.name}`
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
}
