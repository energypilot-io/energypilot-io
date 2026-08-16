import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'

import { Device } from './device.entity.js'
import {
    bucketContext,
    bucketKey,
    bucketStart,
    HOUR_MS,
    rangePredicate,
    sqlExpression,
} from '@/libs/time-buckets.js'

/**
 * Hourly averages per device value, bucketed on the deployment's wall clock.
 *
 * The expression is a callback so the requested window can be pushed into the
 * inner query. As a static string the surrounding `where` could only be applied
 * outside the `group by`, which SQLite cannot push through an aggregate
 * subquery — so every request aggregated the entire history before discarding
 * almost all of it.
 */
@Entity({
    expression: sqlExpression(where => {
        const context = bucketContext(where, HOUR_MS)
        const offset = context.offsetSql

        return `select
                    min(${bucketStart(HOUR_MS, offset)}) as created_at,
                    dv.device_id,
                    dv.name,
                    avg(dv.value) as value
                from snapshot s
                join device_value dv on dv.snapshot_id = s.id
                where ${rangePredicate(context)}
                group by ${bucketKey(HOUR_MS, offset)}, dv.device_id, dv.name`
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
