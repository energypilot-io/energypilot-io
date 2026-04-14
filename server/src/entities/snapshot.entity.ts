import {
    Entity,
    OneToMany,
    PrimaryKey,
    Property,
} from '@mikro-orm/decorators/legacy'

import { DeviceValue } from './device.value.entity'
import { Collection } from '@mikro-orm/core'

@Entity()
export class Snapshot {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @OneToMany(() => DeviceValue, deviceSnapshot => deviceSnapshot.snapshot)
    device_snapshots = new Collection<DeviceValue>(this)
}
