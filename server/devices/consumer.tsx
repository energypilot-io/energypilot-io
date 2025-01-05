import { TemplateDef } from 'server/defs/template'
import { IParameter, parseParameter } from 'templates/template-parser'
import { defaultDeviceConfig, IDevice } from './IDevice'
import { DeviceDef } from 'server/defs/configuration'
import { IConnector } from 'server/connectors/IConnector'

export class ConsumerDevice implements IDevice {
    id: string

    private _configuration: DeviceDef

    private _connector: IConnector

    private _powerParameter: IParameter | undefined

    constructor(
        connector: IConnector,
        deviceDef: Partial<DeviceDef> = {},
        templateDef: Partial<TemplateDef> = {}
    ) {
        this._connector = connector
        this._configuration = { ...defaultDeviceConfig, ...deviceDef }

        this.id = this._configuration.id

        if (
            templateDef.consumer?.power !== undefined &&
            this._connector.templateInterfaceKey in templateDef.consumer?.power
        ) {
            this._powerParameter = parseParameter(
                templateDef.consumer!.power[
                    this._connector.templateInterfaceKey
                ],
                this._connector
            )
        }
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return undefined

        const powerValue = await this._powerParameter?.getValue()
        return powerValue
    }
}
