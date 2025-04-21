import { getEntityManager } from '~/lib/db.server'
import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Device } from 'server/database/entities/device.entity'

export async function action({ params, request }: ActionFunctionArgs) {
    const em = await getEntityManager()

    const device = await em.findOneOrFail(Device, {
        id: { $eq: Number.parseInt(params.deviceId ?? '') },
    })

    switch (request.method) {
        case 'DELETE': {
            await em.remove(device).flush()
            return { success: true }
        }

        case 'POST': {
            const body = await request.json()

            if (body?.isEnabled !== undefined) {
                device.is_enabled = body.isEnabled
                await em.upsert(device)
                return { success: true }
            }
        }
    }

    return { success: false }
}

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
    const em = await getEntityManager()

    const device = await em.findOneOrFail(Device, {
        id: { $eq: Number.parseInt(params.deviceId ?? '') },
    })

    return device
}
