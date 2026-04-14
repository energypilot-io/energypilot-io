import { defineConfig, SqliteDriver } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

import { Snapshot } from './entities/snapshot.entity'
import { Device } from './entities/device.entity'
import { DeviceValue } from './entities/device.value.entity'
import { SnapshotGroupedHourlyView } from './entities/snapshot.grouped.hourly.view.entity'
import { SnapshotGroupedDailyView } from './entities/snapshot.grouped.daily.view.entity'

export default defineConfig({
    driver: SqliteDriver,
    entities: [
        Device,
        DeviceValue,
        Snapshot,
        SnapshotGroupedHourlyView,
        SnapshotGroupedDailyView,
    ],
    debug: process.env.NODE_ENV !== 'production',
    metadataProvider: TsMorphMetadataProvider,
    preferTs: true,
    metadataCache: { enabled: false },
})
