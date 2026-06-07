import { findSnapshotsBetweenDates } from '@/core/snapshot.manager.js'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/:from-:to', async (req: Request, res: Response) => {
    const startTimestamp = new Date(parseInt(req.params.from as string))
    const endTimestamp = new Date(parseInt(req.params.to as string))

    return res.json(
        await findSnapshotsBetweenDates({
            startDate: startTimestamp,
            endDate: endTimestamp,
            grouping: req.query.grouping as string,
        })
    )
})

router.get('/:from-:to/:limit', async (req: Request, res: Response) => {
    const startTimestamp = new Date(parseInt(req.params.from as string))
    const endTimestamp = new Date(parseInt(req.params.to as string))

    return res.json(
        await findSnapshotsBetweenDates({
            startDate: startTimestamp,
            endDate: endTimestamp,
            limit: req.params.limit
                ? parseInt(req.params.limit as string)
                : undefined,
            grouping: req.query.grouping as string,
        })
    )
})

router.get('/latest', async (req: Request, res: Response) => {
    const snapshots = await findSnapshotsBetweenDates({ limit: -1 })

    if (snapshots && (snapshots as object[]).length > 0) {
        return res.json(snapshots)
    } else {
        return res.status(404)
    }
})

// async function findSnapshotsBetweenDates(params: {
//     startDate?: Date
//     endDate?: Date
//     limit?: number
//     grouping?: string
// }): Promise<object | undefined> {
//     const snapshots = (await findSnapshotsBetweenDates(params)) as object[]
//     return snapshots
// }

export const SnapshotsController = router
