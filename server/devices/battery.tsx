import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { BaseDevice } from './base-device'
import { IConnector } from 'server/connectors/IConnector'
import { DeviceDef } from 'server/defs/configuration'

export class BatteryDevice extends BaseDevice {
    private _socParameter: IParameter | undefined
    private _powerParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        templateDef: Partial<TemplateDef> = {}
    ) {
        super(connector, deviceDef)

        if (
            templateDef.battery?.soc !== undefined &&
            this._connector.templateInterfaceKey in templateDef.battery?.soc
        ) {
            this._socParameter = parseParameter(
                templateDef.battery?.soc[this._connector.templateInterfaceKey],
                this._connector
            )
        }

        if (
            templateDef.battery?.power !== undefined &&
            this._connector.templateInterfaceKey in templateDef.battery?.power
        ) {
            this._powerParameter = parseParameter(
                templateDef.battery?.power[
                    this._connector.templateInterfaceKey
                ],
                this._connector
            )
        }
    }

    public async getSoCValue() {
        if (this._socParameter === undefined) return undefined

        const socValue = await this._socParameter?.getValue()
        return socValue
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return undefined

        const chargePowerValue = await this._powerParameter?.getValue()
        return chargePowerValue
    }
}
