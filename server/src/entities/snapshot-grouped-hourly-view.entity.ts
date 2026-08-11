import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'

import { Device } from './device.entity.js'
import {
    bucketKey,
    bucketStart,
    HOUR_MS,
    rangePredicate,
    sqlExpression,
    widenToLocalBuckets,
} from '@/libs/time-buckets.js'

/**
 * Hourly averages per device value.
 *
 * The expression is a callback so the requested time window can be pushed into
 * the inner query. As a static string the surrounding `where` could only be
 * applied outside the `group by`, which SQLite cannot push through an aggregate
 * subquery — so every request aggregated the entire history before discarding
 * almost all of it.
 */
@Entity({
    expression: sqlExpression(where => {
        const range = widenToLocalBuckets(where, HOUR_MS)

        return `select
                    min(${bucketStart(HOUR_MS)}) as created_at,
                    dv.device_id,
                    dv.name,
                    avg(dv.value) as value
                from snapshot s
                join device_value dv on dv.snapshot_id = s.id
                where ${rangePredicate(range)}
                group by ${bucketKey(HOUR_MS)}, dv.device_id, dv.name`
    }),
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
