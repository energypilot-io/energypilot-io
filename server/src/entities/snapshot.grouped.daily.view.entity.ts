import { Entity, Property, ManyToOne } from '@mikro-orm/decorators/legacy'
import { Device } from './device.entity'

@Entity({
    expression: `SELECT 
                    cast(unixepoch(d1.day, 'subsec') * 1000 AS DATETIME) AS created_at,
                    d1.device_id,
                    d1.name,
                    d1.value - COALESCE(d0.value, d1.value) AS value
                FROM (
                    SELECT 
                        DATE(s.created_at / 1000, 'unixepoch') AS day,
                        dv.device_id,
                        dv.name,
                        dv.value,
                        ROW_NUMBER() OVER (PARTITION BY DATE(s.created_at / 1000, 'unixepoch'), dv.device_id, dv.name ORDER BY s.created_at DESC) AS rn
                    FROM snapshot s
                    JOIN device_value dv ON dv.snapshot_id = s.id
                    WHERE dv.name like '%energy%'
                ) d1
                LEFT JOIN (
                    SELECT 
                        DATE(s.created_at / 1000, 'unixepoch') AS day,
                        dv.device_id,
                        dv.name,
                        dv.value,
                        s.created_at,
                        ROW_NUMBER() OVER (PARTITION BY DATE(s.created_at / 1000, 'unixepoch'), dv.device_id, dv.name ORDER BY s.created_at DESC) AS rn
                    FROM snapshot s
                    JOIN device_value dv ON dv.snapshot_id = s.id
                ) d0 ON d0.day = DATE(d1.day, '-1 day') AND d0.device_id = d1.device_id AND d0.name = d1.name AND d0.rn = 1
                WHERE d1.rn = 1`,
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
