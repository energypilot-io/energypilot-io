import { TemplateDef } from 'server/defs/template'
import { IParameter } from 'templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from 'server/interfaces/IInterface'
import { Device } from 'server/database/entities/device.entity'

export class PVDevice extends BaseDevice {
    private _powerParameter: IParameter | undefined
    private _energyParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<TemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, templateDef.pv, deviceDefinition)

        this._powerParameter = this.getParameter(templateDef.pv, 'power')
        this._energyParameter = this.getParameter(templateDef.pv, 'energy')
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return undefined

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }

        return powerValue
    }

    public async getEnergyValue() {
        if (this._energyParameter === undefined) return undefined

        const energyValue = await this._energyParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy [${energyValue} kWh]`)
        }

        return energyValue
    }
}
