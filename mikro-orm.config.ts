import { Options, SqliteDriver } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

import { Snapshot } from 'server/database/entities/snapshot.entity'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'
import { Device } from 'server/database/entities/device.entity'

import { GridEnergyExport } from 'server/database/views/grid-energy-export.entity'
import { GridEnergyImport } from 'server/database/views/grid-energy-import.entity'
import { PvEnergyProduction } from 'server/database/views/pv-energy-production.entity'
import { Setting } from 'server/database/entities/setting.entity'

const config: Options = {
    metadataCache: { enabled: false },
    preferTs: true,
    driver: SqliteDriver,
    entities: [
        DeviceSnapshot,
        Device,
        Snapshot,
        Setting,
        GridEnergyExport,
        GridEnergyImport,
        PvEnergyProduction,
    ],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV !== 'production',
}

export default config
