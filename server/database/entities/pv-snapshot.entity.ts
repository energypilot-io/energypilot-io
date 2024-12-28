import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class PvSnapshot {
    @PrimaryKey()
    id!: number

    @Property()
    createdAt = new Date()

    @Property()
    source!: string

    @Property()
    power!: number

    @Property()
    energy!: number
}
