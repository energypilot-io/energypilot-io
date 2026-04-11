import { Options, BetterSqliteDriver } from '@mikro-orm/better-sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

import { Snapshot } from './entities/snapshot.entity'
import { Device } from './entities/device.entity'
import { DeviceValue } from './entities/device.value.entity'
import { HourlyDeviceValueView } from './entities/hourly-device-value-view.entity'

const config: Options = {
    metadataCache: { enabled: false },
    preferTs: true,
    driver: BetterSqliteDriver,
    entities: [Device, DeviceValue, Snapshot, HourlyDeviceValueView],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV !== 'production',
}

export default config
