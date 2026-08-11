import {
    Entity,
    Index,
    ManyToOne,
    PrimaryKey,
    Property,
} from '@mikro-orm/decorators/legacy'
import { Snapshot } from './snapshot.entity.js'
import { Device } from './device.entity.js'

// Covering index for the "latest value per device and name" lookup the device
// manager runs at startup. Including `value` lets SQLite answer entirely from
// the index instead of touching the table once per candidate row.
@Entity()
@Index({ properties: ['device', 'name', 'snapshot', 'value'] })
export class DeviceValue {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @ManyToOne({ deleteRule: 'cascade' })
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


