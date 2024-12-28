import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { defaultDeviceConfig, IDevice } from './IDevice'
import { IConnector } from 'server/connectors/IConnector'
import { DeviceDef } from 'server/defs/configuration'

export class GridDevice implements IDevice {
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
            templateDef.grid?.power !== undefined &&
            this._connector.templateInterfaceKey in templateDef.grid?.power
        ) {
            this._powerParameter = parseParameter(
                templateDef.grid!.power[this._connector.templateInterfaceKey],
                this._connector
            )
        }

        if (
            templateDef.grid?.energy !== undefined &&
            this._connector.templateInterfaceKey in templateDef.grid?.energy
        ) {
            this._energyParameter = parseParameter(
                templateDef.grid!.energy[this._connector.templateInterfaceKey],
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
