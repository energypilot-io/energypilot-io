import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class Energy {
    @PrimaryKey()
    id!: number

    @Property()
    createdAt = new Date()

    @Property()
    source!: string

    @Property()
    consumption!: number

    @Property()
    grid_power!: number

    @Property()
    pv_power!: number

    @Property()
    battery_soc?: number

    @Property()
    battery_charge_power?: number

    @Property()
    battery_discharge_power?: number
}
