import express from 'express'
import { Request, Response } from 'express'

import { getEntityManager } from '@/core/database-manager.js'
import { Setting } from '@/entities/settings.entity.js'
import {
    getSettingSchema,
    isSecretSetting,
    setSettingValue,
    validateSettingsInput,
} from '@/core/setting-manager.js'

const router = express.Router()

router.get('/schema', (req, res) => {
    return res.json(getSettingSchema())
})

router.get('/', async (req: Request, res: Response) => {
    try {
        const settings = await getEntityManager().findAll(Setting)

        return res.json(
            settings.filter(setting => {
                const [group, name] = setting.name.split('.', 2)
                return !isSecretSetting(group, name)
            })
        )
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

router.post('/', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Invalid request body' })
    }

    let errors: { [key: string]: string } = {}

    for (const settingGroup of Object.keys(req.body)) {
        const settings = req.body[settingGroup]
        if (
            !settings ||
            typeof settings !== 'object' ||
            Array.isArray(settings)
        ) {
            return res.status(400).json({ message: 'Invalid request body' })
        }

        for (const settingName of Object.keys(settings)) {
            errors = {
                ...errors,
                ...validateSettingsInput(
                    settingGroup,
                    settingName,
                    settings[settingName]
                ),
            }
        }
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors)
    } else {
        const em = getEntityManager()

        await em.begin()
        try {
            for (const settingGroup of Object.keys(req.body)) {
                for (const settingName of Object.keys(req.body[settingGroup])) {
                    const value = req.body[settingGroup][settingName]
                    if (
                        isSecretSetting(settingGroup, settingName) &&
                        value === ''
                    ) {
                        continue
                    }

                    await setSettingValue(
                        `${settingGroup}.${settingName}`,
                        value,
                        em
                    )
                }
            }

            await em.commit()

            return res.status(201).json({ message: 'OK' })
        } catch (error) {
            await em.rollback()

            return res.status(500).json({ message: 'Error' })
        }
    }
})

export const SettingsController = router
