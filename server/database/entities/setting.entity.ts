import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'

@Entity()
export class Setting {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @Property()
    @Unique()
    key!: string

    @Property()
    value!: string

    constructor(options: { key: string; group: string; value: string }) {
        this.created_at = new Date()
        this.key = options.key
        this.value = options.value
    }
}
