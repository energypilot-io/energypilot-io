import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { DeviceSnapshot } from '../entities/device-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(DeviceSnapshot, 'p')
            .select([
                raw('max(p.energy) - min(p.energy) as energy_diff'),
                raw('max(p.energy) as energy_total'),
                raw('min(created_at) as created_at'),
            ])
            .where({ $and: [{ type: 'pv' }, where ?? {}] })
            .groupBy(['p.device_id', 'p.type'])
    },
})
export class PvEnergyProduction {
    @Property()
    energy_diff!: number

    @Property()
    energy_total!: number

    @Property()
    created_at!: Date
}
