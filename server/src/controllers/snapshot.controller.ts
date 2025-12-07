import { getLatestSnapshot } from '@/core/data-update-manager'
import { getEntityManager } from '@/core/database'
import { Snapshot } from '@/entities/snapshot.entity'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/:from-:to', async (req: Request, res: Response) => {
    const startTimestamp = new Date(parseInt(req.params.from))
    const endTimestamp = new Date(parseInt(req.params.to))

    return res.json(
        await findSnapshotsBetweenDates({
            startDate: startTimestamp,
            endDate: endTimestamp,
        })
    )
})

router.get('/:from-:to/:limit', async (req: Request, res: Response) => {
    const startTimestamp = new Date(parseInt(req.params.from))
    const endTimestamp = new Date(parseInt(req.params.to))

    return res.json(
        await findSnapshotsBetweenDates({
            startDate: startTimestamp,
            endDate: endTimestamp,
            limit: req.params.limit ? parseInt(req.params.limit) : undefined,
        })
    )
})

router.get('/latest', async (req: Request, res: Response) => {
    const snapshot = await getLatestSnapshot()

    if (snapshot) {
        return res.json(snapshotToJSON(snapshot))
    } else {
        return res.status(400)
    }
})

function snapshotToJSON(snapshot: Snapshot): object {
    return {
        created_at: snapshot.created_at,

        device_snapshots: snapshot.device_snapshots
            .getItems()
            .map((deviceValue) => ({
                device_id: deviceValue.device.id,
                device_name: deviceValue.device.name,
                device_type: deviceValue.device.type,
                name: deviceValue.name,
                value: deviceValue.value,
            })),
    }
}

async function findSnapshotsBetweenDates(params: {
    startDate?: Date
    endDate?: Date
    limit?: number
}): Promise<object> {
    const snapshots = await getEntityManager().find(
        Snapshot,
        {
            created_at: {
                $gte: params.startDate,
                $lte: params.endDate ?? new Date(),
            },
        },
        {
            populate: ['*'],
            orderBy: { created_at: 'ASC' },
            limit: params.limit,
        }
    )

    return snapshots.map((snapshot) => snapshotToJSON(snapshot))
}

export const SnapshotController = router
