import express from 'express'
import { Request, Response } from 'express'

import { getDeviceRegistrySchema } from '@/core/template-engine'
import { getEntityManager, persistEntity } from '@/core/database'
import { Device } from '@/entities/device.entity'

const router = express.Router()

router.get('/registry-schema', (req, res) => {
    return res.json(getDeviceRegistrySchema())
})

router.post('/', async (req: Request, res: Response) => {
    const device = new Device({
        name: req.body.device_name,
        type: req.body.device_type,
        model: req.body.device_model.device_model,
        interface: req.body.device_model.interface.interface,
        isEnabled: true,
        properties: JSON.stringify(
            req.body.device_model.interface.interfaceParameters
        ),
    })

    if (await persistEntity(device)) {
        return res.status(201).json({ message: 'OK' })
    } else {
        return res.status(500).json({ message: 'Error' })
    }
})

router.get('/', async (req: Request, res: Response) => {
    try {
        const devices = await getEntityManager().findAll(Device)

        return res.json(devices)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const device = await getEntityManager().findOne(Device, {
            id: parseInt(req.params.id),
        })

        if (!device) {
            return res.status(404).json({ message: 'Book not found' })
        }

        return res.json(device)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

export const DeviceController = router
