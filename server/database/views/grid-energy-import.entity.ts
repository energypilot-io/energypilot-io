import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { DeviceSnapshot } from '../entities/device-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(DeviceSnapshot, 'g')
            .select([
                raw(
                    'max(g.energy_import) - min(g.energy_import) as energy_diff'
                ),
                raw('min(created_at) as created_at'),
                raw('max(g.energy_import) as energy_total'),
            ])
            .where({ $and: [{ type: 'grid' }, where ?? {}] })
            .groupBy(['g.device_name'])
    },
})
export class GridEnergyImport {
    @Property()
    energy_diff!: number

    @Property()
    energy_total!: number

    @Property()
    created_at!: Date
}
