import { TemplateDef } from 'server/defs/template'
import { IParameter } from 'templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from 'server/interfaces/IInterface'
import { Device } from 'server/database/entities/device.entity'

export class BatteryDevice extends BaseDevice {
    private _socParameter: IParameter | undefined
    private _powerParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<TemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, templateDef.battery, deviceDefinition)

        this._socParameter = this.getParameter(templateDef.battery, 'soc')
        this._powerParameter = this.getParameter(templateDef.battery, 'power')
    }

    public async getSoCValue() {
        if (this._socParameter === undefined) return undefined

        const socValue = await this._socParameter?.getValue()
        if (socValue !== undefined) {
            this._logger.debug(`Read SoC [${socValue} %]`)
        }

        return socValue
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return undefined

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }

        return powerValue
    }
}
