import { getEntityManager } from '~/lib/db.server'
import { Energy } from 'server/database/entities/energy.entity'

export const loader = async () => {
    const energyEntities = await getEntityManager().find(
        Energy,
        {},
        {
            orderBy: { createdAt: 'DESC' },
            limit: 1,
        }
    )
    return energyEntities
}
