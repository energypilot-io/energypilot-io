import { EntityName, EventArgs, EventSubscriber } from '@mikro-orm/core'
import { Device } from '../entities/device.entity'
import { createDevice, removeDevice } from 'server/core/devices'

export class DeviceSubscriber implements EventSubscriber<Device> {
    getSubscribedEntities(): EntityName<Device>[] {
        return [Device]
    }

    afterDelete({ entity: device }: EventArgs<Device>): void | Promise<void> {
        removeDevice(device.name)
    }

    afterCreate({ entity: device }: EventArgs<Device>): void | Promise<void> {
        createDevice(device)
    }
}
