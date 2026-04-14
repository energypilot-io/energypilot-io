import { getEntityManager } from '@/core/database'
import { SnapshotGroupedHourlyView } from '@/entities/snapshot.grouped.hourly.view.entity'
import { Snapshot } from '@/entities/snapshot.entity'
import express from 'express'
import { Request, Response } from 'express'
import { SnapshotGroupedDailyView } from '@/entities/snapshot.grouped.daily.view.entity'

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

function snapshotToJSON(snapshot: Snapshot): object {
    return {
        created_at: snapshot.created_at,

        device_snapshots: snapshot.device_snapshots
            .getItems()
            .map(deviceValue => ({
                device_id: deviceValue.device.id,
                device_name: deviceValue.device.name,
                device_type: deviceValue.device.type,
                name: deviceValue.name,
                value: deviceValue.value,
            })),
    }
}

function groupedSnapshotsToJSON(
    snapshots: SnapshotGroupedHourlyView[] | SnapshotGroupedDailyView[]
): object {
    const result: { [key: number]: any[] } = {}

    snapshots.forEach(snapshot => {
        const timestamp: number = snapshot.created_at.valueOf()

        if (!(timestamp in result)) {
            result[timestamp] = []
        }

        result[timestamp].push({
            device_id: snapshot.device.id,
            device_name: snapshot.device.name,
            device_type: snapshot.device.type,
            name: snapshot.name,
            value: snapshot.value,
        })
    })

    return Object.keys(result).map(timestamp => {
        return {
            created_at: new Date(Number.parseFloat(timestamp)),
            device_snapshots: result[Number(timestamp)],
        }
    })
}

async function findSnapshotsBetweenDates(params: {
    startDate?: Date
    endDate?: Date
    limit?: number
    grouping?: string
}): Promise<object | undefined> {
    let targetEntity
    switch (params.grouping) {
        case 'hour':
            targetEntity = SnapshotGroupedHourlyView
            break

        case 'day':
            targetEntity = SnapshotGroupedDailyView
            break

        default:
            targetEntity = Snapshot
    }

    const snapshots = await getEntityManager().find(
        targetEntity,
        params.startDate && params.endDate
            ? {
                  created_at: {
                      $gte: params.startDate,
                      $lte: params.endDate ?? new Date(),
                  },
              }
            : {},
        {
            populate: ['*'],
            orderBy: { created_at: (params.limit ?? 0) < 0 ? 'DESC' : 'ASC' },
            limit: params.limit ? Math.abs(params.limit) : undefined,
        }
    )

    if (targetEntity === Snapshot) {
        return snapshots.map(snapshot =>
            snapshotToJSON(snapshot as any as Snapshot)
        )
    } else if (
        targetEntity === SnapshotGroupedHourlyView ||
        targetEntity === SnapshotGroupedDailyView
    ) {
        return groupedSnapshotsToJSON(snapshots)
    }

    return undefined
}

export const SnapshotController = router
