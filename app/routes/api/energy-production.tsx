import { getEntityManager } from '~/lib/db.server'
import { PvEnergyProduction } from 'server/database/views/pv-energy-production.entity'
import type { Route } from './+types/energy-production'

export const loader = async ({ params }: Route.LoaderArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(PvEnergyProduction, {
        created_at: { $gt: timestamp },
    })
    return energyEntities
}
