import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'

import { Device } from './device.entity.js'
import {
    bucketKey,
    bucketStart,
    DAY_MS,
    ENERGY_VALUE_NAMES,
    rangePredicate,
    sqlExpression,
    widenToLocalBuckets,
} from '@/libs/time-buckets.js'

/**
 * Daily energy produced or consumed, as the delta between the first and last
 * reading of a cumulative counter within a local day.
 *
 * Like the hourly view the window is pushed into the inner query — doubly
 * important here, because the window functions are an optimiser barrier and
 * used to sort the whole table twice per request.
 *
 * `bucket_start` is taken from the *first* row of each day rather than computed
 * on the surviving `rn = 1` row: on a DST day those two rows sit at different
 * UTC offsets, and only the first one yields the true local midnight.
 */
@Entity({
    expression: sqlExpression(where => {
        const range = widenToLocalBuckets(where, DAY_MS)
        const names = ENERGY_VALUE_NAMES.map(name => `'${name}'`).join(', ')

        return `with daily as (
                    select
                        dv.device_id,
                        dv.name,
                        dv.value,
                        first_value(${bucketStart(DAY_MS)}) over w_asc as bucket_start,
                        first_value(dv.value) over w_asc as first_value,
                        row_number() over w_desc as rn
                    from snapshot s
                    join device_value dv on dv.snapshot_id = s.id
                    where ${rangePredicate(range)}
                      and dv.name in (${names})
                    window
                        w_asc as (partition by ${bucketKey(DAY_MS)}, dv.device_id, dv.name order by s.created_at asc),
                        w_desc as (partition by ${bucketKey(DAY_MS)}, dv.device_id, dv.name order by s.created_at desc)
                )
                select
                    bucket_start as created_at,
                    device_id,
                    name,
                    value - first_value as value
                from daily
                where rn = 1`
    }),
    readonly: true,
})
export class SnapshotGroupedDailyView {
    @Property()
    created_at!: Date

    @ManyToOne()
    device!: Device

    @Property()
    name!: string

    @Property({ type: 'real' })
    value!: number
}
