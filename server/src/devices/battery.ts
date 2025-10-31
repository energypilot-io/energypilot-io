import { IParameter } from '@/libs/templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from '@/interfaces/interface'
import { Device } from '@/entities/device.entity'
import { DeviceTemplateDef } from '@/defs/device-template'

export class BatteryDevice extends BaseDevice {
    private _socParameter: IParameter | undefined
    private _powerParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<DeviceTemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, deviceDefinition)

        this._socParameter = this.getParameter(templateDef.battery, 'soc')
        this._powerParameter = this.getParameter(templateDef.battery, 'power')
    }

    public async getSoCValue() {
        if (this._socParameter === undefined) return 0

        const socValue = await this._socParameter?.getValue()
        if (socValue !== undefined) {
            this._logger.debug(`Read SoC [${socValue} %]`)
        }

        return socValue
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return 0

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }

        return powerValue
    }
}
