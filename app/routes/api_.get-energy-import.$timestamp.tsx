import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from 'react-router';
import { GridEnergyImport } from 'server/database/views/grid-energy-import.entity'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(GridEnergyImport, {
        created_at: { $gt: timestamp },
    })
    return energyEntities
}
