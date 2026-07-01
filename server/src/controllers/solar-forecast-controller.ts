import { getSolarForecastData } from '@/modules/solar-forecast.module.js'
import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
    return res.json(getSolarForecastData())
})

export const SolarForecastController = router


