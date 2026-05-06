import { getSolarForecastData } from '@/modules/solar-forecast'
import express from 'express'
import { Request, Response } from 'express'

const router = express.Router()

router.get('/', (req, res) => {
    return res.json(getSolarForecastData())
})

export const SolarForecastController = router
