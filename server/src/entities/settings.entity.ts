import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

@Entity()
export class Setting {
    @PrimaryKey()
    name!: string

    @Property({ nullable: true })
    value?: string | null

    @Property()
    created_at = new Date()

    @Property({ onUpdate: () => new Date() })
    updated_at = new Date()

    constructor(options: { name: string; value?: string | null }) {
        this.name = options.name
        this.value = options.value ?? null
    }
}
