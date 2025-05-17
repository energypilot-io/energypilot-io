import { getEntityManager } from '~/lib/db.server'
import { GridEnergyExport } from 'server/database/views/grid-energy-export.entity'
import type { Route } from './+types/energy-export'

export const loader = async ({ params }: Route.LoaderArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(GridEnergyExport, {
        created_at: { $gt: timestamp },
    })
    return energyEntities
}
