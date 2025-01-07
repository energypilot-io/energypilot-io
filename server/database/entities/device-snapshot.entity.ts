import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'

@Entity()
export class DeviceSnapshot {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @Property()
    device_id!: string

    @Property()
    type!: string

    @Property()
    label?: string

    @Property()
    power?: number

    @Property()
    energy?: number

    @Property()
    soc?: number

    @Property()
    charge_power?: number

    @Property()
    discharge_power?: number

    constructor(options: {
        device_id: string
        type: 'grid' | 'pv' | 'battery' | 'consumer'
        label?: string
        power?: number
        energy?: number
        soc?: number
    }) {
        this.type = options.type
        this.label = options.label
        this.device_id = options.device_id
        this.power = options.power
        this.energy = options.energy
        this.soc = options.soc
    }
}
