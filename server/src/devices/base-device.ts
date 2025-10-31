import { ChildLogger, getLogger } from '@/core/logmanager'
import { Device } from '@/entities/device.entity'
import { IInterface } from '@/interfaces/interface'
import { parseParameter } from '@/libs/templates/template-parser'

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
