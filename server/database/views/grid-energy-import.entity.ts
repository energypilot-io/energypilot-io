import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { DeviceSnapshot } from '../entities/device-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(DeviceSnapshot, 'g')
            .select([
                raw('max(g.energy) - min(g.energy) as energy_diff'),
                raw('min(s.created_at) as created_at'),
                raw('max(g.energy) as energy_total'),
            ])
            .join('g.snapshot', 's')
            .where({ type: 'grid' })
            .groupBy(['g.device_id', 'g.type'])
    },
})
export class GridEnergyImport {
    @Property()
    energyDiff!: number

    @Property()
    energyTotal!: number

    @Property()
    createdAt!: Date
}
