import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'
import { Device } from './device.entity'

@Entity({
    expression: `WITH daily AS (
                    SELECT 
                        DATE(s.created_at / 1000, 'unixepoch') AS day,
                        dv.device_id,
                        dv.name,
                        dv.value,
                        s.created_at,
                        FIRST_VALUE(dv.value) OVER (PARTITION BY DATE(s.created_at / 1000, 'unixepoch'), dv.device_id, dv.name ORDER BY s.created_at ASC) AS first_value,
                        ROW_NUMBER() OVER (PARTITION BY DATE(s.created_at / 1000, 'unixepoch'), dv.device_id, dv.name ORDER BY s.created_at DESC) AS rn
                    FROM snapshot s
                    JOIN device_value dv ON dv.snapshot_id = s.id
                    WHERE dv.name like '%energy%'
                )
                SELECT 
                    cast(unixepoch(day, 'subsec') * 1000 AS DATETIME) AS created_at,
                    device_id,
                    name,
                    value - first_value AS value
                FROM daily
                WHERE rn = 1`,
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
