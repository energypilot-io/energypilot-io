import { getEntityManager } from '~/lib/db.server'

import { Device } from 'server/database/entities/device.entity'

import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { getValidatedFormData } from 'remix-hook-form'

import * as zod from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConstraintViolationException } from '@mikro-orm/core'
import i18next from '~/lib/i18n.server'
import { templates } from 'server/core/template-manager'

export const newDeviceSchema = zod.object({
    id: zod.number().optional(),
    name: zod.string().min(1),
    template: zod.string().min(1),
    interface: zod.string().min(1),
    properties: zod.string().min(1),
})

export const newDeviceDefaultValues = {
    id: undefined,
    name: '',
    template: '',
    interface: '',
    properties: '',
}

export type EnrichedDevice = Device & {
    logo?: string
}

export async function action({ request }: ActionFunctionArgs) {
    const {
        errors,
        data,
        receivedValues: defaultValues,
    } = await getValidatedFormData<zod.infer<typeof newDeviceSchema>>(
        request,
        zodResolver(newDeviceSchema)
    )
    if (errors) {
        return { errors, defaultValues }
    }

    try {
        const templateTokens = data.template.split(':')

        const em = await getEntityManager()
        const device = em.create(Device, {
            id: data.id,
            created_at: new Date(),
            name: data.name,
            type: templateTokens[0],
            template: templateTokens[1],
            interface: data.interface,
            properties: data.properties,
        })

        if (data.id !== undefined) {
            await em.upsert(device)
        } else {
            await em.persistAndFlush(device)
        }

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

export const loader = async ({ context }: LoaderFunctionArgs) => {
    const devices = await getEntityManager().find(
        Device,
        {},
        {
            orderBy: { name: 'asc' },
        }
    )

    return devices.map((item) => {
        const templates = context.templates as templates.TemplateRegistry

        return {
            ...item,
            logo: templates[item.type][item.template].logo,
        } as any as EnrichedDevice
    })
}
