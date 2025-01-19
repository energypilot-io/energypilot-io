import { getEntityManager } from '~/lib/db.server'

import { Device } from 'server/database/entities/device.entity'

import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { getValidatedFormData } from 'remix-hook-form'

import * as zod from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const newDeviceSchema = zod.object({
    name: zod.string().min(1),
})

export const newDeviceDefaultValues = {
    name: '',
}

type FormData = zod.infer<typeof newDeviceSchema>

export const newDeviceSchemaResolver = zodResolver(newDeviceSchema)

export async function action({ request }: ActionFunctionArgs) {
    const {
        errors,
        data,
        receivedValues: defaultValues,
    } = await getValidatedFormData<FormData>(request, newDeviceSchemaResolver)
    if (errors) {
        // The keys "errors" and "defaultValues" are picked up automatically by useRemixForm
        return { errors, defaultValues }
    }

    try {
        const em = await getEntityManager()
        const device = em.create(Device, {
            created_at: new Date(),
            name: data.name,
            template: '',
            properties: '',
        })

        em.persistAndFlush(device)

        return {
            success: true,
            defaultValues: newDeviceDefaultValues,
        }
    } catch (error) {
        return { success: false }
    }
}

export const loader = async () => {
    const devices = await getEntityManager().find(
        Device,
        {},
        {
            orderBy: { name: 'asc' },
        }
    )
    return devices
}
