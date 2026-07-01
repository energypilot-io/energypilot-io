import { Data } from '@/entities/data.entity.js'
import { ChildLogger, getLogger } from './log-manager.js'
import { getEntityManager } from './database-manager.js'

let _logger: ChildLogger

export async function initDataStorageManager() {
    _logger = getLogger('data-storage')
}

export async function getDataFromStorage(name: string): Promise<Data | null> {
    return getEntityManager().findOne(Data, { name })
}

export async function writeDataToStorage(name: string, value: any) {
    const dataEntity = new Data({
        name: name,
        value: value,
    })

    await getEntityManager().upsert(dataEntity)
}


