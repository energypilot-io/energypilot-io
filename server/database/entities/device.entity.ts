import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity()
export class Device {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @Property()
    name!: string

    @Property()
    template!: string

    @Property()
    properties!: string

    constructor(options: {
        name: string
        template: string
        properties: string
    }) {
        this.created_at = new Date()
        this.name = options.name
        this.template = options.template
        this.properties = options.properties
    }
}
