import express from 'express'
import { Request, Response } from 'express'

import { getEntityManager } from '@/core/database'
import { Setting } from '@/entities/settings.entity'
import {
    getSettingSchema,
    validateSettingsInput,
} from '@/core/settings-manager'

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
    const errors: { [key: string]: string } = validateSettingsInput(req.body)

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors)
    } else {
        const em = getEntityManager()

        await em.begin()
        try {
            for (const key in req.body) {
                const setting = new Setting({
                    name: key,
                    value: req.body[key],
                })

                em.upsert(setting)
            }
            await em.commit()

            return res.status(201).json({ message: 'OK' })
        } catch (error) {
            await em.rollback()

            return res.status(500).json({ message: 'Error' })
        }
    }
})

export const SettingController = router
