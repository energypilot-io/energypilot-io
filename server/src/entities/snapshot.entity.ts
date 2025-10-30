import {
    Collection,
    Entity,
    OneToMany,
    PrimaryKey,
    Property,
} from '@mikro-orm/core'

@Entity()
export class Snapshot {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()
}
