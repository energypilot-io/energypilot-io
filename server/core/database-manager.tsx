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

const SQLITE_MEMORY_DB: string = ':memory:'

var _logger: logging.ChildLogger
var _orm: MikroORM

export namespace database {
    class CustomLogger extends DefaultLogger {
        log(namespace: LoggerNamespace, message: string, context?: LogContext) {
            if (namespace === 'info') {
                _logger.info(message)
            } else {
                _logger.debug(`[${namespace}] ${message}`)
            }
        }
    }

    export async function initDatabase(databaseDef: DatabaseDef | undefined) {
        _logger = logging.getLogger('database')

        _orm = await MikroORM.init({
            ...config,
            dbName: getFilename(databaseDef),
            loggerFactory: (options) => new CustomLogger(options),
        })

        await _orm.schema.updateSchema({ dropTables: false })
    }

    function getFilename(databaseDef: DatabaseDef | undefined) {
        if (databaseDef?.filename === SQLITE_MEMORY_DB) {
            _logger.warn(
                'Using in memory database. Data will not be persisted!'
            )
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
            _logger.error(
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
            _logger.error(err)
            return false
        }
    }

    export function createContext(next: any) {
        RequestContext.create(_orm.em, next)
    }
}
