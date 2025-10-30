import { Options, SqliteDriver } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

import { Snapshot } from './entities/snapshot.entity'
import { Device } from './entities/device.entity'

const config: Options = {
    metadataCache: { enabled: false },
    preferTs: true,
    driver: SqliteDriver,
    entities: [Snapshot, Device],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV !== 'production',
}

export default config
