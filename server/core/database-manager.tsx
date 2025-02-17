import fs from 'fs'
import path from 'node:path'

import { DatabaseDef } from 'server/defs/configuration'

import { logging } from 'server/core/log-manager'
import {
    MikroORM,
    DefaultLogger,
    LoggerNamespace,
    LogContext,
    RequestContext,
} from '@mikro-orm/sqlite'

import config from 'mikro-orm.config.ts'
import { DeviceSubscriber } from 'server/database/subscribers/device-subscriber'
import { SettingSubscriber } from 'server/database/subscribers/setting-subscriber'

const SQLITE_MEMORY_DB: string = ':memory:'

export type DatabaseObserver = () => void

const _observers: DatabaseObserver[] = []

export function registerDatabaseObserver(observer: DatabaseObserver) {
    _observers.push(observer)
}

export namespace database {
    var _orm: MikroORM

    class CustomLogger extends DefaultLogger {
        log(namespace: LoggerNamespace, message: string, context?: LogContext) {
            const logger = logging.getLogger('database')

            if (namespace === 'info') {
                logger.info(message)
            } else {
                logger.debug(`[${namespace}] ${message}`)
            }
        }
    }

    export async function initDatabase(databaseDef: DatabaseDef | undefined) {
        _orm = await MikroORM.init({
            ...config,
            dbName: getFilename(databaseDef),
            loggerFactory: (options) => new CustomLogger(options),
            subscribers: [new DeviceSubscriber(), new SettingSubscriber()],
        })

        await _orm.schema.updateSchema({ dropTables: false })

        _observers.forEach((observer) => {
            observer()
        })
    }

    function getFilename(databaseDef: DatabaseDef | undefined) {
        if (databaseDef?.filename === SQLITE_MEMORY_DB) {
            logging
                .getLogger('database')
                .warn('Using in memory database. Data will not be persisted!')
            return SQLITE_MEMORY_DB
        }

        try {
            fs.accessSync(process.env.DATA_DIR!, fs.constants.W_OK)

            return path.join(
                process.env.DATA_DIR!,
                databaseDef !== undefined && databaseDef.filename !== undefined
                    ? databaseDef.filename
                    : 'energypilot-io.db'
            )
        } catch {
            logging
                .getLogger('database')
                .error(
                    `Data directory [${process.env.DATA_DIR}] not writeable. Switching to in-memory database storage.`
                )

            return SQLITE_MEMORY_DB
        }
    }

    export async function persistEntity(
        entity: any,
        callback?: () => void
    ): Promise<boolean> {
        try {
            if (_orm === undefined || _orm.em === undefined) return false

            const em = _orm.em.fork()
            await em.persist(entity).flush()

            if (callback !== undefined) callback()

            return true
        } catch (err) {
            logging.getLogger('database').error(err)
            return false
        }
    }

    export function getEntityManager() {
        return _orm?.em.fork()
    }

    export function createContext(next: any) {
        RequestContext.create(_orm.em, next)
    }
}
