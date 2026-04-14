import { Entity, ManyToOne, Property } from '@mikro-orm/core'
import { Device } from './device.entity'

@Entity({
    expression:
        "SELECT cast(unixepoch(strftime('%Y-%m-%d %H:00:00', datetime(s.created_at / 1000, 'unixepoch')), 'subsec') * 1000 AS DATETIME) AS created_at, dv.device_id, dv.name, AVG(dv.value) AS value FROM device_value dv JOIN snapshot s ON dv.snapshot_id = s.id GROUP BY strftime('%Y-%m-%d %H:00:00', datetime(s.created_at / 1000, 'unixepoch')), dv.device_id, dv.name",
    readonly: true,
})
export class SnapshotGroupedHourlyView {
    @Property()
    created_at!: Date

    @ManyToOne()
    device!: Device

    @Property()
    name!: string

    @Property({ type: 'real' })
    value!: number
}
