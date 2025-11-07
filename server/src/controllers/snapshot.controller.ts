import { getEntityManager } from '@/core/database'
import { Snapshot } from '@/entities/snapshot.entity'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/today', async (req: Request, res: Response) => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    return res.json(await findSnapshotsBetweenDates(startOfToday))
})

async function findSnapshotsBetweenDates(
    startDate?: Date,
    endDate?: Date
): Promise<object> {
    const snapshots = await getEntityManager().find(
        Snapshot,
        {
            created_at: {
                $gte: startDate,
                $lte: endDate ?? new Date(),
            },
        },
        {
            populate: ['*'],
        }
    )

    return snapshots.map((snapshot) => ({
        created_at: snapshot.created_at,

        device_snapshots: snapshot.device_snapshots
            .getItems()
            .map((deviceValue) => ({
                device_id: deviceValue.device.id,
                device_name: deviceValue.device.name,
                name: deviceValue.name,
                value: deviceValue.value,
            })),
    }))
}

export const SnapshotController = router
