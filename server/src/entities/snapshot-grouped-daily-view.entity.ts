import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'

import { Device } from './device.entity.js'
import {
    bucketContext,
    bucketKey,
    bucketStart,
    DAY_MS,
    ENERGY_VALUE_NAMES,
    rangePredicate,
    sqlExpression,
} from '@/libs/time-buckets.js'

/**
 * Daily energy produced or consumed, as the delta between the first and last
 * reading of a cumulative counter within a day of the deployment's wall clock.
 *
 * Like the hourly view the window is pushed into the inner query — doubly
 * important here, because the window functions are an optimiser barrier and
 * used to sort the whole table twice per request.
 *
 * `bucket_start` is taken from the *first* row of each day rather than computed
 * on the surviving `rn = 1` row: on a day that changes UTC offset those two
 * rows sit at different offsets, and only the first yields the true local
 * midnight.
 */
@Entity({
    expression: sqlExpression(where => {
        const context = bucketContext(where, DAY_MS)
        const offset = context.offsetSql
        const names = ENERGY_VALUE_NAMES.map(name => `'${name}'`).join(', ')
        const partition = `partition by ${bucketKey(DAY_MS, offset)}, dv.device_id, dv.name`

        return `with daily as (
                    select
                        dv.device_id,
                        dv.name,
                        dv.value,
                        first_value(${bucketStart(DAY_MS, offset)}) over w_asc as bucket_start,
                        first_value(dv.value) over w_asc as first_value,
                        row_number() over w_desc as rn
                    from snapshot s
                    join device_value dv on dv.snapshot_id = s.id
                    where ${rangePredicate(context)}
                      and dv.name in (${names})
                    window
                        w_asc as (${partition} order by s.created_at asc),
                        w_desc as (${partition} order by s.created_at desc)
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
