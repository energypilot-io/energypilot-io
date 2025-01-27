import { getEntityManager } from '~/lib/db.server'

import { Device } from 'server/database/entities/device.entity'

import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { getValidatedFormData } from 'remix-hook-form'

import * as zod from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConstraintViolationException } from '@mikro-orm/core'
import i18next from '~/lib/i18n.server'

export const newDeviceSchema = zod.object({
    name: zod.string().min(1),
    template: zod.string().min(1),
    interface: zod.string().min(1),
    properties: zod.string().min(1),
})

export const newDeviceDefaultValues = {
    name: '',
    template: '',
    interface: '',
    properties: '',
}

type FormData = zod.infer<typeof newDeviceSchema>

const newDeviceSchemaResolver = zodResolver(newDeviceSchema)

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
        const templateTokens = data.template.split(':')

        const em = await getEntityManager()
        const device = em.create(Device, {
            created_at: new Date(),
            name: data.name,
            type: templateTokens[0],
            template: templateTokens[1],
            interface: data.interface,
            properties: data.properties,
        })

        await em.persistAndFlush(device)

        return {
            success: true,
            defaultValues: newDeviceDefaultValues,
        }
    } catch (error) {
        let t = await i18next.getFixedT(request)

        let errorMessage: string = t('errors.db.cannotCreateDevice')

        if (error instanceof ConstraintViolationException) {
            errorMessage = t('errors.db.createDeviceConstraintViolation')
        }

        return { success: false, error: errorMessage }
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
