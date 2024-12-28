import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { defaultDeviceConfig, IDevice } from './IDevice'
import { DeviceDef } from 'server/defs/configuration'
import { IConnector } from 'server/connectors/IConnector'

export class PVDevice implements IDevice {
    id: string

    private _configuration: DeviceDef

    private _connector: IConnector

    private _powerParameter: IParameter | undefined
    private _energyParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        templateDef: Partial<TemplateDef> = {}
    ) {
        this._connector = connector
        this._configuration = { ...defaultDeviceConfig, ...deviceDef }

        this.id = this._configuration.id

        if (
            templateDef.pv?.power !== undefined &&
            this._connector.templateInterfaceKey in templateDef.pv?.power
        ) {
            this._powerParameter = parseParameter(
                templateDef.pv!.power[this._connector.templateInterfaceKey],
                this._connector
            )
        }

        if (
            templateDef.pv?.energy !== undefined &&
            this._connector.templateInterfaceKey in templateDef.pv?.energy
        ) {
            this._energyParameter = parseParameter(
                templateDef.pv!.energy[this._connector.templateInterfaceKey],
                this._connector
            )
        }
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return undefined

        const powerValue = await this._powerParameter?.getValue()
        return powerValue
    }

    public async getEnergyValue() {
        if (this._energyParameter === undefined) return undefined

        const energyValue = await this._energyParameter?.getValue()
        return energyValue
    }
}
