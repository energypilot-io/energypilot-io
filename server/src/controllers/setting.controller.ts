import express from 'express'
import { Request, Response } from 'express'

import { getEntityManager } from '@/core/database'
import { Setting } from '@/entities/settings.entity'
import { getSettingSchema } from '@/core/settings-manager'

const router = express.Router()

router.get('/schema', (req, res) => {
    return res.json(getSettingSchema())
})

router.get('/', async (req: Request, res: Response) => {
    try {
        const devices = await getEntityManager().findAll(Setting)

        return res.json(devices)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

export const SettingController = router
