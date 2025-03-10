import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { DeviceSnapshot } from '../entities/device-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(DeviceSnapshot, 'g')
            .select([
                raw(
                    'max(g.energy_export) - min(g.energy_export) as energy_diff'
                ),
                raw('min(g.created_at) as created_at'),
                raw('max(g.energy_export) as energy_total'),
            ])
            .leftJoinAndSelect('g.device', 'd')
            .where({ $and: [{ type: 'grid' }, where ?? {}] })
            .groupBy(['d.id'])
    },
})
export class GridEnergyExport {
    @Property()
    energy_diff!: number

    @Property()
    energy_total!: number

    @Property()
    created_at!: Date
}
