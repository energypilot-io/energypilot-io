import express from 'express'
import { Request, Response } from 'express'

import { getActiveModules } from '@/core/module.manager'

const router = express.Router()

router.get('/active', (req: Request, res: Response) => {
    return res.json(getActiveModules())
})

export const ModulesController = router
