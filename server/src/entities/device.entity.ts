import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'

@Entity()
export class Device {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @Property()
    @Unique()
    name!: string

    @Property()
    type!: string

    @Property()
    model!: string

    @Property()
    interface!: string

    @Property()
    properties!: string

    constructor(options: {
        name: string
        type: string
        model: string
        interface: string
        properties: string
    }) {
        this.created_at = new Date()
        this.type = options.type
        this.name = options.name
        this.model = options.model
        this.interface = options.interface
        this.properties = options.properties
    }
}
