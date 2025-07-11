import { getEntityManager } from '~/lib/db.server'
import { Device } from 'server/database/entities/device.entity'
import type { Route } from './+types/device'

export async function action({ params, request }: Route.ActionArgs) {
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

export const loader = async ({ params }: Route.LoaderArgs) => {
    const em = await getEntityManager()

    const device = await em.findOneOrFail(Device, {
        id: { $eq: Number.parseInt(params.deviceId ?? '') },
    })

    return device
}
