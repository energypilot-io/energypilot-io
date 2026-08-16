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
import { deploymentTimeZone } from '@/libs/time-buckets.js'
import {
    isDatabaseCorruptionError,
    recoverDatabase,
} from './database-recovery.js'

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

async function openOrm() {
    _orm = (await MikroORM.init({
        ...(config as any),
        dbName: getFilename(),
        loggerFactory: (options: LoggerOptions) => new CustomLogger(options),
        subscribers: [new SettingEventSubscriber()],
    })) as any
}

/**
 * Reads every table cheaply to see whether the file is still sound.
 *
 * `pragma integrity_check` would be thorough but walks the entire database —
 * measured at 4.5 seconds on a 148 MB file, which is too much to pay on every
 * start. Counting rows costs about 25 ms on the same file and still trips on
 * the kind of damage that stops the application working, because a count has to
 * walk a B-tree too.
 *
 * Returns the offending error, or `undefined` when everything read cleanly.
 */
async function findCorruption(): Promise<unknown | undefined> {
    const connection = _orm.em.getConnection()

    try {
        const tables = (await connection.execute(
            "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"
        )) as { name: string }[]

        for (const table of tables) {
            await connection.execute(`select count(*) from "${table.name}"`)
        }
    } catch (err) {
        if (isDatabaseCorruptionError(err)) return err
        throw err
    }

    return undefined
}

/**
 * Rebuilds the database when it is found to be malformed, before anything else
 * has had a chance to touch it.
 *
 * Doing this here rather than letting the corruption surface later means no
 * other manager has started yet, so there is nothing to unwind — the ORM is
 * simply closed, the file rebuilt, and the ORM reopened.
 */
async function repairIfCorrupted() {
    const corruption = await findCorruption()

    if (corruption === undefined) return

    const logger = getLogger('database')
    logger.error(
        'The database is malformed and cannot be read. Attempting automatic recovery.',
        corruption
    )

    await _orm.close(true)

    const result = await recoverDatabase(getFilename())

    if (!result.recovered) {
        logger.error(
            `Automatic recovery failed: ${result.reason}. ` +
                'The original database has been left untouched; restore a copy from the backups folder to continue.'
        )
        throw corruption
    }

    const summary = (result.rows ?? [])
        .map(row => `${row.table}=${row.count}`)
        .join(', ')

    logger.info(
        `Database rebuilt in ${Math.round((result.elapsedMs ?? 0) / 1000)} s [${summary}]. ` +
            `The damaged original is kept as [${path.basename(result.quarantinedAs!)}].`
    )

    await openOrm()

    const stillBroken = await findCorruption()
    if (stillBroken !== undefined) throw stillBroken
}

export async function initDatabaseManager() {
    await openOrm()

    // Before anything writes to the file. Setting the journal mode force
    // checkpoints a WAL into the main database, which is the last thing that
    // should happen to a file whose soundness has not been established — on a
    // damaged database that turns recoverable data into lost data.
    await repairIfCorrupted()

    await applyPragmas()

    // Chart buckets follow this zone, so make a misconfigured container
    // obvious rather than letting it silently report UTC days.
    getLogger('database').info(
        `Grouping snapshots in timezone [${deploymentTimeZone()}]`
    )

    await _orm.schema.update({ safe: true, dropTables: false })
    await _orm.seeder.seed(DeviceSeeder)

    _initObservers.forEach(initObserver => {
        initObserver()
    })
}

/**
 * Keeps SQLite on its default rollback journal.
 *
 * WAL was used here for a while and has been removed. It requires every
 * connection to be on the same machine, because it coordinates through a
 * memory-mapped `-shm` file, and EnergyPilot's data directory is frequently a
 * network share — where that coordination silently fails and corrupts the
 * database rather than reporting an error.
 *
 * The mode is set explicitly rather than simply left alone: journal mode is
 * stored in the database file, so an installation that a previous version
 * switched to WAL would otherwise stay on WAL forever. Setting it back also
 * checkpoints and removes any leftover `-wal` and `-shm` files.
 *
 * `synchronous` is deliberately not touched — SQLite's default (FULL) is the
 * right setting for a rollback journal, where anything more relaxed can leave
 * the database corrupt after a power cut.
 */
async function applyPragmas() {
    const connection = _orm.em.getConnection()

    try {
        await connection.execute('pragma journal_mode = DELETE')
    } catch (err) {
        getLogger('database').warn('Could not set the journal mode', err)
    }

    const active = (await connection.execute('pragma journal_mode')) as {
        journal_mode: string
    }[]

    getLogger('database').info(`Journal mode [${active[0]?.journal_mode}]`)
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

/** Absolute path of the live database file. */
export function getDatabaseFile(): string {
    return getFilename()
}

export interface BackupProgress {
    totalPages: number
    remainingPages: number
}

/**
 * The slice of the `better-sqlite3` API used outside this module. Spelling it
 * out keeps the coupling to the driver's internals explicit and small.
 */
export interface SqliteHandle {
    exec(sql: string): unknown
    pragma(sql: string): unknown
    prepare(sql: string): { get(...params: unknown[]): unknown }
    backup(
        destination: string,
        options?: { progress?: (info: BackupProgress) => number }
    ): Promise<unknown>
}

/**
 * The underlying `better-sqlite3` handle.
 *
 * MikroORM exposes no backup API, and SQLite's own online backup is the only
 * way to copy a database that is being written to. The driver keeps the handle
 * on its connection, so this reaches through one documented layer rather than
 * opening a second connection to the same file.
 */
export function getRawDatabase(): SqliteHandle {
    const database = (
        _orm?.em?.getConnection() as unknown as
            | { database?: SqliteHandle }
            | undefined
    )?.database

    if (database === undefined) {
        throw new Error(
            'No SQLite handle available — the database driver changed its internals'
        )
    }

    return database
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


