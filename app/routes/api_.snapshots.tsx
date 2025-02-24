import { getEntityManager } from '~/lib/db.server'

import { LoaderFunctionArgs } from '@remix-run/node'
import { Snapshot } from 'server/database/entities/snapshot.entity'

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url)

    const fromQuery = url.searchParams.get('from')
    const toQuery = url.searchParams.get('to')

    const fromTimestamp =
        fromQuery !== null ? new Date(Number.parseFloat(fromQuery)) : new Date()
    const toTimestamp =
        toQuery !== null ? new Date(Number.parseFloat(toQuery)) : new Date()

    const em = getEntityManager()

    const deviceSnapshots = await em.find(
        Snapshot,
        {
            $and: [
                { created_at: { $gte: fromTimestamp } },
                { created_at: { $lte: toTimestamp } },
            ],
        },
        {
            populate: ['*'],
        }
    )

    return deviceSnapshots
}
