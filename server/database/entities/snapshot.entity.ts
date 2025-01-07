import {
    Collection,
    Entity,
    OneToMany,
    PrimaryKey,
    Property,
} from '@mikro-orm/core'
import { DeviceSnapshot } from './device-snapshot.entity'

@Entity()
export class Snapshot {
    @PrimaryKey()
    id!: number

    @Property()
    created_at = new Date()

    @OneToMany(
        () => DeviceSnapshot,
        (deviceSnapshot) => deviceSnapshot.snapshot
    )
    device_snapshots = new Collection<DeviceSnapshot>(this)
}
