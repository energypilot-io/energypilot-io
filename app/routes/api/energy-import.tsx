import { getEntityManager } from '~/lib/db.server'
import { GridEnergyImport } from 'server/database/views/grid-energy-import.entity'
import type { Route } from './+types/energy-import'

export const loader = async ({ params }: Route.LoaderArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(GridEnergyImport, {
        created_at: { $gt: timestamp },
    })
    return energyEntities
}
