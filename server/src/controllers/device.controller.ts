import express from 'express'
import { Request, Response } from 'express'

import { getEntityManager, upsertEntity } from '@/core/database'
import { Device } from '@/entities/device.entity'
import {
    createDevice,
    getDeviceClassForDeviceDefinition,
    getDeviceRegistrySchema,
    removeDevice,
} from '@/core/device-manager'
import { RegisteredInterfaceClasses } from '@/core/config'

const router = express.Router()

router.get('/registry-schema', (req, res) => {
    return res.json(getDeviceRegistrySchema())
})

router.post('/', async (req: Request, res: Response) => {
    const device = new Device({
        id: req.body.id,
        name: req.body.device_name,
        type: req.body.device_type,
        model: req.body.device_model,
        interface: req.body.interface,
        isEnabled: true,
        properties: JSON.stringify(req.body.interface_properties),
    })

    var errors: { [key: string]: string } = validateDeviceInput(device)

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors)
    } else {
        if (await upsertEntity(device)) {
            removeDevice(device.name)
            await createDevice(device)

            return res.status(201).json({ message: 'OK' })
        } else {
            return res.status(500).json({ message: 'Error' })
        }
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
            return res.status(404).json({ message: 'Device not found' })
        }

        return res.json(device)
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const device = await getEntityManager().findOne(Device, {
            id: parseInt(req.params.id),
        })
        if (!device) {
            return res.status(404).json({ message: 'Device not found' })
        }
        await getEntityManager().remove(device).flush()
        removeDevice(device.name)

        return res.json({ message: 'Device deleted successfully' })
    } catch (e: any) {
        return res.status(400).json({ message: e.message })
    }
})

function validateDeviceInput(device: Device): { [key: string]: string } {
    var errors: { [key: string]: string } = {}

    if (!device.name) {
        errors['device_name'] = 'required'
    }

    if (!device.type) {
        errors['device_type'] = 'required'
    }

    if (!device.model) {
        errors['device_model'] = 'required'
    }

    if (!device.interface) {
        errors['interface'] = 'required'
    }

    getDeviceClassForDeviceDefinition(device) ||
        (errors['device_definition'] = 'invalid_device_definition')

    if (RegisteredInterfaceClasses.includes(device.interface)) {
        const interfaceClass = RegisteredInterfaceClasses[device.interface]

        errors = {
            ...errors,
            ...interfaceClass.validateParameters(device.properties),
        }
    } else {
        errors['interface'] = 'invalid_interface'
    }

    return errors
}

export const DeviceController = router
