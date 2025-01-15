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
        super(connector, deviceDef, templateDef.battery)

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
