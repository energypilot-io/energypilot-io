import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'

@Entity()
export class DeviceSnapshot {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

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
    energy_import?: number

    @Property()
    energy_export?: number

    @Property()
    soc?: number

    constructor(options: {
        device_id: string
        type: 'grid' | 'pv' | 'battery' | 'consumer'
        label?: string
        power?: number
        energy?: number
        energy_import?: number
        energy_export?: number
        soc?: number
    }) {
        this.type = options.type
        this.label = options.label
        this.device_id = options.device_id
        this.power = options.power
        this.energy = options.energy
        this.energy_import = options.energy_import
        this.energy_export = options.energy_export
        this.soc = options.soc
    }
}
