import {
    Entity,
    Index,
    OneToMany,
    PrimaryKey,
    Property,
} from '@mikro-orm/decorators/legacy'

import { DeviceValue } from './device-value.entity.js'
import { Collection } from '@mikro-orm/core'

@Entity()
export class Snapshot {
    @PrimaryKey()
    id!: number

    // Every snapshot query filters and/or sorts on this column, including the
    // `order by created_at desc limit 1` behind GET /snapshots/latest.
    @Property()
    @Index()
    created_at = new Date()

    @OneToMany(() => DeviceValue, deviceSnapshot => deviceSnapshot.snapshot)
    device_snapshots = new Collection<DeviceValue>(this)
}


