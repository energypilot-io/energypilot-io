import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { PvSnapshot } from '../entities/pv-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(PvSnapshot, 'p')
            .select([
                'p.source',
                raw('max(p.energy) - min(p.energy) as energy_diff'),
                raw('max(p.energy) as energy_total'),
                raw('min(p.created_at) as created_at'),
            ])
            .where(where ?? {})
            .groupBy('p.source')
    },
})
export class PvEnergyProduction {
    @Property()
    source!: string

    @Property()
    energy_diff!: number

    @Property()
    energy_total!: number

    @Property()
    created_at!: Date
}
