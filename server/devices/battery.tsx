import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { defaultDeviceConfig, IDevice } from './IDevice'
import { IConnector } from 'server/connectors/IConnector'
import { DeviceDef } from 'server/defs/configuration'

export class BatteryDevice implements IDevice {
    id: string

    private _configuration: DeviceDef
    private _connector: IConnector

    private _socParameter: IParameter | undefined

    private _chargePowerParameter: IParameter | undefined
    private _dischargePowerParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        templateDef: Partial<TemplateDef> = {}
    ) {
        this._connector = connector
        this._configuration = { ...defaultDeviceConfig, ...deviceDef }

        this.id = this._configuration.id

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
            templateDef.battery?.charge_power !== undefined &&
            this._connector.templateInterfaceKey in
                templateDef.battery?.charge_power
        ) {
            this._chargePowerParameter = parseParameter(
                templateDef.battery?.charge_power[
                    this._connector.templateInterfaceKey
                ],
                this._connector
            )
        }

        if (
            templateDef.battery?.discharge_power !== undefined &&
            this._connector.templateInterfaceKey in
                templateDef.battery?.discharge_power
        ) {
            this._dischargePowerParameter = parseParameter(
                templateDef.battery?.discharge_power[
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

    public async getChargePowerValue() {
        if (this._chargePowerParameter === undefined) return undefined

        const chargePowerValue = await this._chargePowerParameter?.getValue()
        return chargePowerValue
    }

    public async getDischargePowerValue() {
        if (this._dischargePowerParameter === undefined) return undefined

        const dischargePowerValue =
            await this._dischargePowerParameter?.getValue()
        return dischargePowerValue
    }
}
