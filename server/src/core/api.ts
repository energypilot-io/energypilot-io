import express from 'express'
import { getDeviceRegistrySchema } from './template-engine'

const router = express.Router()

router.get('/device-registry-schema', (req, res) => {
    res.json(getDeviceRegistrySchema())
})

export default router
