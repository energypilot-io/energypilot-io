import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'

@Entity()
export class PvSnapshot {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @Property()
    device_id!: string

    @Property()
    power!: number

    @Property()
    energy!: number
}
