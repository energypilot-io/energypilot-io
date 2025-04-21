import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from 'react-router';
import { GridEnergyExport } from 'server/database/views/grid-energy-export.entity'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(GridEnergyExport, {
        created_at: { $gt: timestamp },
    })
    return energyEntities
}
