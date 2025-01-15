import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { BaseDevice } from './base-device'
import { DeviceDef } from 'server/defs/configuration'
import { IConnector } from 'server/connectors/IConnector'

export class ConsumerDevice extends BaseDevice {
    private _powerParameter: IParameter | undefined
    private _energyParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        templateDef: Partial<TemplateDef> = {}
    ) {
        super(connector, deviceDef, templateDef.consumer)

        this._energyParameter = this.getParameter(
            templateDef.consumer,
            'energy'
        )
        this._powerParameter = this.getParameter(templateDef.consumer, 'power')
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
