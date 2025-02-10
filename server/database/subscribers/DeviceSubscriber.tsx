import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { Device } from '../entities/device.entity'
import { devices } from 'server/core/devices'

export class DeviceSubscriber implements EventSubscriber<Device> {
    afterDelete({ entity: device }: EventArgs<Device>): void | Promise<void> {
        if (device instanceof Device) {
            devices.removeDevice(device.name)
        }
    }

    afterCreate({ entity: device }: EventArgs<Device>): void | Promise<void> {
        if (device instanceof Device) {
            devices.deviceFactory(device)
        }
    }
}
