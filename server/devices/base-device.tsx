import { IConnector } from 'server/connectors/IConnector'
import { DeviceDef } from 'server/defs/configuration'

export const defaultDeviceConfig: DeviceDef = {
    id: '',
}

export class BaseDevice {
    id: string
    label?: string

    protected _connector: IConnector
    protected _configuration: DeviceDef

    constructor(connector: IConnector, deviceDef: Partial<DeviceDef> = {}) {
        this._connector = connector
        this._configuration = { ...defaultDeviceConfig, ...deviceDef }

        this.id = this._configuration.id
        this.label = this._configuration.label
    }
}
