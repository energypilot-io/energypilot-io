import { getEntityManager } from '~/lib/db.server'

import { PvEnergyProduction } from 'server/database/views/pv-energy-production.entity'
import { LoaderFunctionArgs } from '@remix-run/node'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(PvEnergyProduction, {
        createdAt: { $gt: timestamp },
    })
    return energyEntities
}
