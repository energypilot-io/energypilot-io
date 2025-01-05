import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Snapshot } from './snapshot.entity'

@Entity()
export class ConsumerSnapshot {
    @PrimaryKey()
    id!: number

    @ManyToOne()
    snapshot!: Snapshot

    @Property()
    device_id!: string

    @Property()
    name?: string

    @Property()
    power!: number
}
