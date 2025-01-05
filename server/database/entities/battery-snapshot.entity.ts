import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'

@Entity()
export class BatterySnapshot {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @Property()
    device_id!: string

    @Property()
    name?: string

    @Property()
    soc!: number

    @Property()
    charge_power!: number

    @Property()
    discharge_power!: number
}
