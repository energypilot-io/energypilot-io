import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from '@remix-run/node'
import { GridEnergyImport } from 'server/database/views/grid-energy-import.entity'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(GridEnergyImport, {
        createdAt: { $gt: timestamp },
    })
    return energyEntities
}
