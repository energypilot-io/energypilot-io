import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'
import { Device } from './device.entity'

@Entity()
export class DeviceValue {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @ManyToOne()
    device!: Device

    @Property()
    name!: string

    @Property({ type: 'real' })
    value!: number

    constructor(options: { device: Device; name: string; value: number }) {
        this.device = options.device
        this.name = options.name
        this.value = options.value
    }
}
