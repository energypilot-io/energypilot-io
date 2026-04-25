import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

@Entity()
export class Setting {
    @PrimaryKey()
    name!: string

    @Property()
    value!: string

    @Property()
    created_at = new Date()

    constructor(options: { name: string; value: string }) {
        this.name = options.name
        this.value = options.value
    }
}
