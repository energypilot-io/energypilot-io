import { Device } from '@/entities/device.entity'
import { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

export const VirtualDeviceHome: Device = new Device({
    id: -1,
    name: 'Home',
    isEnabled: true,
    type: 'home',
    model: 'home',
    interface: 'home',
    properties: '{}',
})

export class DeviceSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        // will get persisted automatically
        const device = em.upsert(VirtualDeviceHome)
    }
}
