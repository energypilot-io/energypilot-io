import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class GridSnapshot {
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
