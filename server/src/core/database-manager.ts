import fs from 'fs'
import path from 'node:path'

import {
    MikroORM,
    DefaultLogger,
    LoggerNamespace,
    LogContext,
    LoggerOptions,
    EntityManager,
} from '@mikro-orm/sqlite'

import config from '@/mikro-orm-config.js'
import { ChildLogger, getLogger } from './log-manager.js'
import { SettingEventSubscriber } from './setting-manager.js'
import { DeviceSeeder } from '@/seeder/device-seeder.js'

export type DatabaseInitObserver = () => void

let _orm: MikroORM

const _initObservers: DatabaseInitObserver[] = []

export function registerDatabaseInitObserver(observer: DatabaseInitObserver) {
    _initObservers.push(observer)
}

class CustomLogger extends DefaultLogger {
    _logger: ChildLogger

    constructor(options: LoggerOptions) {
        super(options)

        this._logger = getLogger('database')
    }

    log(namespace: LoggerNamespace, message: string, context?: LogContext) {
        this._logger.namespace(namespace).log(message)
    }

    error(
        namespace: LoggerNamespace,
        message: string,
        context?: LogContext
    ): void {
        this._logger.namespace(namespace).error(message, context)
    }

    warn(
        namespace: LoggerNamespace,
        message: string,
        context?: LogContext
    ): void {
        this._logger.namespace(namespace).warn(message, context)
    }
}

export async function initDatabaseManager() {
    _orm = (await MikroORM.init({
        ...(config as any),
        dbName: getFilename(),
        loggerFactory: (options: LoggerOptions) => new CustomLogger(options),
        subscribers: [new SettingEventSubscriber()],
    })) as any

    await applyPragmas()

    await _orm.schema.update({ safe: true, dropTables: false })
    await _orm.seeder.seed(DeviceSeeder)

    _initObservers.forEach(initObserver => {
        initObserver()
    })
}

/**
 * The driver only sets `foreign_keys`, leaving SQLite on its rollback journal
 * with a full fsync per commit — so the once-a-minute snapshot write blocks
 * every dashboard read for the duration of the flush.
 *
 * WAL lets readers run concurrently with the writer, and `synchronous = NORMAL`
 * is the usual companion: under WAL it still cannot corrupt the database, it
 * only risks losing the most recent commits if the machine loses power. That is
 * an acceptable trade for a minutely metrics sample.
 */
async function applyPragmas() {
    const connection = _orm.em.getConnection()

    for (const pragma of [
        'pragma journal_mode = WAL',
        'pragma synchronous = NORMAL',
    ]) {
        try {
            await connection.execute(pragma)
        } catch (err) {
            getLogger('database').warn(`Could not apply [${pragma}]`, err)
        }
    }
}

function getFilename() {
    try {
        fs.accessSync(process.env.DATA_DIR!, fs.constants.W_OK)

        return path.join(process.env.DATA_DIR!, 'energypilot-io.db')
    } catch {
        throw new Error(
            `Data directory [${process.env.DATA_DIR}] not writeable. Switching to in-memory database storage.`
        )
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
        getLogger('database').error(err)
        return false
    }
}

export async function upsertEntity(
    entity: any,
    callback?: () => void
): Promise<boolean> {
    try {
        if (_orm === undefined || _orm.em === undefined) return false

        const em = _orm.em.fork()
        await em.upsert(entity)

        if (callback !== undefined) callback()

        return true
    } catch (err) {
        getLogger('database').error(err)
        return false
    }
}

export function getEntityManager(): EntityManager {
    return _orm.em.fork() as any
}


