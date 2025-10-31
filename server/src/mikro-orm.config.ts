import { Options, SqliteDriver } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

import { Snapshot } from './entities/snapshot.entity'
import { Device } from './entities/device.entity'
import { DeviceValue } from './entities/device.value.entity'

const config: Options = {
    metadataCache: { enabled: false },
    preferTs: true,
    driver: SqliteDriver,
    entities: [Device, DeviceValue, Snapshot],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV !== 'production',
}

export default config
