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
        const settings = await getEntityManager().findAll(Setting)

        return res.json(settings)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

router.post('/', async (req: Request, res: Response) => {
    console.log(req.body)
})

export const SettingController = router
