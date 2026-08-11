import {
    getSolarForecastData,
    getSolarForecastHistory,
} from '@/modules/solar-forecast-module.js'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/', (req, res) => {
    return res.json(getSolarForecastData())
})

router.get('/history/:from-:to', async (req: Request, res: Response) => {
    const startTimestamp = new Date(parseInt(req.params.from as string))
    const endTimestamp = new Date(parseInt(req.params.to as string))

    return res.json(
        await getSolarForecastHistory({
            startDate: startTimestamp,
            endDate: endTimestamp,
        })
    )
})

export const SolarForecastController = router
