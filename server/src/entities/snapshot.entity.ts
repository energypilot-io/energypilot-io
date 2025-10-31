import {
    Collection,
    Entity,
    OneToMany,
    PrimaryKey,
    Property,
} from '@mikro-orm/core'
import { DeviceValue } from './device.value.entity'

@Entity()
export class Snapshot {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @OneToMany(() => DeviceValue, (deviceSnapshot) => deviceSnapshot.snapshot)
    device_snapshots = new Collection<DeviceValue>(this)
}
