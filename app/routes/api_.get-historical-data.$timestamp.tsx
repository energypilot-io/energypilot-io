import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from '@remix-run/node'
import { Energy } from 'server/database/entities/energy.entity'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const energyEntities = await getEntityManager().find(Energy, {
        createdAt: { $gt: timestamp },
    })
    return energyEntities
}
