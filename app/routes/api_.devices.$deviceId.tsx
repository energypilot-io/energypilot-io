import { getEntityManager } from '~/lib/db.server'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'

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
    }

    return null
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const em = await getEntityManager()

    const device = await em.findOneOrFail(Device, {
        id: { $eq: Number.parseInt(params.deviceId ?? '') },
    })

    return device
}
