import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from '@remix-run/node'
import { Snapshot } from 'server/database/entities/snapshot.entity'

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const timestamp =
        params.timestamp !== undefined
            ? new Date(Number.parseFloat(params.timestamp))
            : new Date()

    const deviceSnapshots = await getEntityManager().find(
        Snapshot,
        {
            created_at: { $gt: timestamp },
        },
        {
            populate: ['*'],
        }
    )
    return deviceSnapshots
}
