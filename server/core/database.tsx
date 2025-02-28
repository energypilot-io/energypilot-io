import fs from 'fs'
import path from 'node:path'

import {
    MikroORM,
    DefaultLogger,
    LoggerNamespace,
    LogContext,
    RequestContext,
    LoggerOptions,
} from '@mikro-orm/sqlite'

import config from 'mikro-orm.config.ts'
import { DeviceSubscriber } from 'server/database/subscribers/device-subscriber'
import { SettingSubscriber } from 'server/database/subscribers/setting-subscriber'
import { ChildLogger, getLogger } from './logmanager'

var _orm: MikroORM

const _initObservers: DatabaseInitObserver[] = []

export type DatabaseInitObserver = () => void

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

export async function initDatabase() {
    _orm = await MikroORM.init({
        ...config,
        dbName: getFilename(),
        loggerFactory: (options) => new CustomLogger(options),
        subscribers: [new DeviceSubscriber(), new SettingSubscriber()],
    })

    await _orm.schema.updateSchema({ dropTables: false })

    _initObservers.forEach((initObserver) => {
        initObserver()
    })
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

export function getEntityManager() {
    return _orm?.em.fork()
}

export function createContext(next: any) {
    RequestContext.create(_orm.em, next)
}
