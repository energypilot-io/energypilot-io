import { IParameter } from '@/libs/templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from '@/interfaces/interface'
import { Device } from '@/entities/device.entity'
import { DeviceTemplateDef } from '@/defs/device-template'

export class ConsumerDevice extends BaseDevice {
    private _powerParameter: IParameter | undefined
    private _energyParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<DeviceTemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, deviceDefinition)

        this._energyParameter = this.getParameter(
            templateDef.consumer,
            'energy'
        )
        this._powerParameter = this.getParameter(templateDef.consumer, 'power')
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return 0

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }

        return powerValue
    }

    public async getEnergyValue() {
        if (this._energyParameter === undefined) return 0

        const energyValue = await this._energyParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy [${energyValue} kWh]`)
        }

        return energyValue
    }
}
