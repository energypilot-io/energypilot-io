import { Options, SqliteDriver } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

const config: Options = {
    metadataCache: { enabled: false },
    driver: SqliteDriver,
    entities: ['server/database/**/*.entity.js'],
    entitiesTs: ['server/database/**/*.entity.ts'],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV !== 'production',
}

export default config
