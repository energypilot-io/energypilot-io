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
    template!: string

    @Property()
    interface!: string

    @Property({ default: true })
    is_enabled!: boolean

    @Property({ default: false })
    is_connected!: boolean

    @Property()
    properties!: string

    constructor(options: {
        name: string
        type: string
        template: string
        interface: string
        properties: string
        is_enabled: boolean
        is_connected: boolean
    }) {
        this.created_at = new Date()
        this.type = options.type
        this.name = options.name
        this.template = options.template
        this.interface = options.interface
        this.is_connected = options.is_connected
        this.is_enabled = options.is_enabled
        this.properties = options.properties
    }
}
