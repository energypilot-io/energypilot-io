import { getLatestSnapshot } from '@/core/data-update-manager'
import { getEntityManager } from '@/core/database'
import { Snapshot } from '@/entities/snapshot.entity'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/today', async (req: Request, res: Response) => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    return res.json(
        await findSnapshotsBetweenDates({ startDate: startOfToday })
    )
})

router.get('/today/:limit', async (req: Request, res: Response) => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    return res.json(
        await findSnapshotsBetweenDates({
            startDate: startOfToday,
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
