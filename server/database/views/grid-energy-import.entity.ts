import { Entity, Property, raw } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/sqlite'
import { GridSnapshot } from '../entities/grid-snapshot.entity'

@Entity({
    expression: (em: EntityManager, where, options) => {
        return em
            .createQueryBuilder(GridSnapshot, 'g')
            .select([
                'g.source',
                raw('max(g.energy) - min(g.energy) as energy_diff'),
                raw('min(g.created_at) as created_at'),
                raw('max(g.energy) as energy_total'),
            ])
            .where(where ?? {})
            .groupBy('g.source')
    },
})
export class GridEnergyImport {
    @Property()
    source!: string

    @Property()
    energy_diff!: number

    @Property()
    energy_total!: number

    @Property()
    created_at!: Date
}
