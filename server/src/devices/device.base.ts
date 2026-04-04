import { ChildLogger, getLogger } from '@/core/logmanager'
import { Device } from '@/entities/device.entity'
import { IInterface } from '@/interfaces/interface'

export type DeviceDefinition = {
    model: string
    types: string[]
    interfaces: string[]
}

export abstract class DeviceBase {
    public deviceDefinition: Device

    protected _connector: IInterface

    protected _logger: ChildLogger

    constructor(connector: IInterface, deviceDefinition: Device) {
        this._connector = connector
        this.deviceDefinition = deviceDefinition

        this._logger = getLogger(
            `${this.deviceDefinition.type}.${this.deviceDefinition.name}`
        )
    }

    static getDeviceDefinition(): DeviceDefinition {
        throw new Error('Method not implemented! Use derived class')
    }
}
