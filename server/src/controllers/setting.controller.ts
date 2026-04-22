import express from 'express'
import { Request, Response } from 'express'

import { getEntityManager } from '@/core/database'
import { Setting } from '@/entities/settings.entity'

const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
    try {
        const devices = await getEntityManager().findAll(Setting)

        return res.json(devices)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

export const SettingController = router
