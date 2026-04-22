import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

@Entity()
export class Setting {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @Property()
    name!: string

    @Property()
    value!: string
}
