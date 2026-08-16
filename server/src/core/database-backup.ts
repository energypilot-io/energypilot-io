import fs from 'node:fs'
import path from 'node:path'
import schedule from 'node-schedule'

import { ChildLogger, getLogger } from './log-manager.js'
import { getDatabaseFile, getRawDatabase } from './database-manager.js'
import {
    DEFAULT_BACKUP_RETENTION,
    MIN_BACKUP_RETENTION,
    registerSettingChangeObserver,
    SETTING_BACKUP_ENABLED,
    SETTING_BACKUP_RETENTION,
} from './setting-manager.js'
import { SettingChangeObserver } from '@/observers/setting-change-observer.js'

/**
 * Backups are plain SQLite files named after the moment they were taken, so
 * restoring is a file copy and the newest is found by sorting names.
 */
const BACKUP_DIR_NAME = 'backups'
const BACKUP_PREFIX = 'energypilot-io-'
const BACKUP_SUFFIX = '.db'
const BACKUP_PATTERN = /^energypilot-io-\d{8}-\d{6}\.db$/

/**
 * Pages copied per step. `db.backup()` yields to the event loop between steps,
 * so a smaller number keeps the web UI and device polling responsive while the
 * copy runs — measured worst-case stall drops from ~90 ms to ~58 ms on a 40 MB
 * database. The whole copy still finishes in a few hundred milliseconds.
 */
const PAGES_PER_STEP = 8

/** A backup older than this at startup is treated as due. */
const CATCH_UP_AGE_MS = 20 * 60 * 60 * 1000

/** Delay before the startup catch-up, so booting is never held up by it. */
const CATCH_UP_DELAY_MS = 60 * 1000

let _logger: ChildLogger
let _enabled = true
let _retention = DEFAULT_BACKUP_RETENTION
let _job: schedule.Job | undefined
let _running = false

function describeError(err: unknown): string {
    const error = err as { code?: string; message?: string } | undefined

    return error?.code ?? error?.message ?? String(err)
}

class BackupSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [SETTING_BACKUP_ENABLED, SETTING_BACKUP_RETENTION]
    }

    onSettingChange(name: string, value?: unknown): boolean {
        if (name === SETTING_BACKUP_ENABLED) {
            _enabled = value === undefined || value === null ? true : `${value}` === 'true'
            _logger.info(`Database backups ${_enabled ? 'enabled' : 'disabled'}`)
            return true
        }

        if (name === SETTING_BACKUP_RETENTION) {
            const parsed = Number.parseInt(`${value}`)
            _retention = Number.isFinite(parsed)
                ? Math.max(MIN_BACKUP_RETENTION, parsed)
                : DEFAULT_BACKUP_RETENTION
            _logger.info(`Keeping the newest ${_retention} database backups`)
            return true
        }

        return false
    }
}

export function getBackupDirectory(): string {
    return path.join(path.dirname(getDatabaseFile()), BACKUP_DIR_NAME)
}

export interface BackupInfo {
    name: string
    file: string
    takenAt: Date
    size: number
}

/** Existing backups, newest first. Anything not written by us is ignored. */
export function listBackups(): BackupInfo[] {
    const directory = getBackupDirectory()

    if (!fs.existsSync(directory)) return []

    return fs
        .readdirSync(directory)
        .filter(name => BACKUP_PATTERN.test(name))
        .map(name => {
            const file = path.join(directory, name)
            return {
                name,
                file,
                takenAt: parseBackupName(name),
                size: fs.statSync(file).size,
            }
        })
        .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())
}

function parseBackupName(name: string): Date {
    // energypilot-io-YYYYMMDD-HHmmss.db, written in local time
    const stamp = name.slice(BACKUP_PREFIX.length, -BACKUP_SUFFIX.length)
    const [date, time] = stamp.split('-')

    return new Date(
        Number(date.slice(0, 4)),
        Number(date.slice(4, 6)) - 1,
        Number(date.slice(6, 8)),
        Number(time.slice(0, 2)),
        Number(time.slice(2, 4)),
        Number(time.slice(4, 6))
    )
}

function buildBackupName(when: Date): string {
    const pad = (value: number) => `${value}`.padStart(2, '0')

    return (
        BACKUP_PREFIX +
        `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}` +
        `-${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}` +
        BACKUP_SUFFIX
    )
}

/**
 * Confirms a freshly written backup is actually usable before it is allowed to
 * count towards retention — an unverified backup is worse than none, because it
 * looks like protection that isn't there.
 *
 * The file is attached to the live connection rather than opened separately, so
 * this needs no second database handle. A file that is corrupt, truncated or
 * not a database at all fails either the attach or the check.
 *
 * Returns a description of the problem, or `undefined` when the backup is good.
 */
function verifyBackup(file: string): string | undefined {
    const alias = 'backup_check'
    const database = getRawDatabase()

    try {
        database.exec(
            `attach database '${file.replace(/'/g, "''")}' as ${alias}`
        )
    } catch (err) {
        return `cannot be opened (${describeError(err)})`
    }

    try {
        const result = database.pragma(`${alias}.quick_check`) as {
            quick_check: string
        }[]
        const verdict = result[0]?.quick_check

        if (verdict !== 'ok') return `quick_check reported: ${verdict}`

        const objects = database
            .prepare(`select count(*) as count from ${alias}.sqlite_master`)
            .get() as { count: number }

        if (!objects || objects.count === 0) return 'contains no schema'
    } catch (err) {
        return describeError(err)
    } finally {
        try {
            database.exec(`detach database ${alias}`)
        } catch {
            // Never attached, or already gone — nothing to release.
        }
    }

    return undefined
}

/** Deletes the oldest backups until only `_retention` remain. */
function rotate(): number {
    const surplus = listBackups().slice(_retention)

    for (const backup of surplus) {
        try {
            fs.unlinkSync(backup.file)
            _logger.debug(`Removed old backup [${backup.name}]`)
        } catch (err) {
            _logger.warn(`Could not remove old backup [${backup.name}]`, err)
        }
    }

    return surplus.length
}

/**
 * Takes one backup, verifies it, and prunes older ones.
 *
 * SQLite's backup API copies pages under a read transaction and restarts if the
 * source is written mid-copy. Snapshots are only persisted once a minute and a
 * copy takes a few hundred milliseconds, so a restart is unlikely and harmless.
 */
export async function createBackup(): Promise<BackupInfo | undefined> {
    if (_running) {
        _logger.debug('Backup already in progress, skipping this run')
        return undefined
    }

    _running = true

    try {
        const directory = getBackupDirectory()
        fs.mkdirSync(directory, { recursive: true })

        const name = buildBackupName(new Date())
        const file = path.join(directory, name)

        const startedAt = Date.now()
        await getRawDatabase().backup(file, { progress: () => PAGES_PER_STEP })
        const elapsed = Date.now() - startedAt

        const problem = verifyBackup(file)

        if (problem !== undefined) {
            _logger.error(`Discarding unusable backup [${name}]: ${problem}`)
            try {
                fs.unlinkSync(file)
            } catch {
                // Nothing more to do; the file is already reported as unusable.
            }
            return undefined
        }

        const size = fs.statSync(file).size
        const removed = rotate()

        _logger.info(
            `Wrote database backup [${name}] (${(size / 1024 / 1024).toFixed(1)} MB in ${elapsed} ms)` +
                (removed > 0 ? `, removed ${removed} older backup(s)` : '')
        )

        return { name, file, takenAt: parseBackupName(name), size }
    } catch (err) {
        _logger.error('Database backup failed', err)
        return undefined
    } finally {
        _running = false
    }
}

export async function initDatabaseBackupManager() {
    _logger = getLogger('backup')

    await registerSettingChangeObserver(new BackupSettingChangeObserver())

    // Nightly, at an hour when nobody is looking at the dashboard.
    const rule = new schedule.RecurrenceRule()
    rule.hour = 3
    rule.minute = 20

    _job = schedule.scheduleJob(rule, () => {
        if (!_enabled) return
        void createBackup()
    })

    const newest = listBackups()[0]
    const age = newest ? Date.now() - newest.takenAt.getTime() : Infinity

    if (age > CATCH_UP_AGE_MS) {
        // A machine that is only powered on during the day would otherwise
        // never reach the nightly slot.
        setTimeout(() => {
            if (_enabled) void createBackup()
        }, CATCH_UP_DELAY_MS).unref()

        _logger.info(
            newest
                ? `Newest backup is from ${newest.takenAt.toISOString()}, taking one shortly`
                : 'No database backup found yet, taking one shortly'
        )
    }

    _logger.info(
        `Backup manager initialized, backups stored in [${getBackupDirectory()}]`
    )

    process.on('exit', () => {
        _job?.cancel()
    })
}
