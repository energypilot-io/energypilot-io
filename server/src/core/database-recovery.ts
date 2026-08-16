import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

import { getLogger } from './log-manager.js'

/**
 * SQLite reports a structurally broken file as one of these. `SQLITE_CORRUPT`
 * is a damaged B-tree; `SQLITE_NOTADB` means even the header is unreadable.
 */
const CORRUPTION_CODES = new Set(['SQLITE_CORRUPT', 'SQLITE_NOTADB'])

/** Tables `.recover` invents for rows it cannot attribute to a real table. */
const RECOVERY_SCRATCH_TABLE = 'lost_and_found'

export function isDatabaseCorruptionError(err: unknown): boolean {
    const code = (err as { code?: string } | undefined)?.code

    if (code !== undefined && CORRUPTION_CODES.has(code)) return true

    const message = (err as { message?: string } | undefined)?.message ?? ''

    return (
        message.includes('database disk image is malformed') ||
        message.includes('file is not a database')
    )
}

function run(
    command: string,
    args: string[],
    options: { stdin?: NodeJS.ReadableStream } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { windowsHide: true })

        let stdout = ''
        let stderr = ''
        child.stdout.on('data', chunk => {
            if (stdout.length < 8192) stdout += chunk.toString()
        })
        child.stderr.on('data', chunk => {
            if (stderr.length < 8192) stderr += chunk.toString()
        })

        child.on('error', reject)
        child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }))

        if (options.stdin) options.stdin.pipe(child.stdin)
    })
}

/**
 * Whether the `sqlite3` command line tool is on PATH. It ships in the container
 * image; on a development machine it usually will not, in which case recovery
 * is reported as unavailable rather than attempted.
 */
export async function isRecoveryAvailable(): Promise<boolean> {
    try {
        const result = await run('sqlite3', ['--version'])
        return result.code === 0
    } catch {
        return false
    }
}

export interface RecoveryResult {
    recovered: boolean
    reason?: string
    quarantinedAs?: string
    rows?: { table: string; count: number }[]
    elapsedMs?: number
}

function timestamp(): string {
    const now = new Date()
    const pad = (v: number) => `${v}`.padStart(2, '0')

    return (
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    )
}

/**
 * Rebuilds a malformed database in place.
 *
 * The damaged file is moved aside first and never deleted, so a failed or
 * unsatisfactory recovery can always be revisited by hand. `.recover` is then
 * piped straight into a new database — piping rather than staging a dump on
 * disk matters, because the dump is larger than the database itself (277 MB for
 * a 145 MB file in testing) and roughly halves the time.
 *
 * The result is only put in place once `integrity_check` passes on it, so the
 * application never starts against something still broken.
 */
export async function recoverDatabase(file: string): Promise<RecoveryResult> {
    const logger = getLogger('database')
    const startedAt = Date.now()

    if (!(await isRecoveryAvailable())) {
        return {
            recovered: false,
            reason:
                'the sqlite3 command line tool is not installed, so the database cannot be rebuilt automatically',
        }
    }

    // 1. Move the damaged file out of the way, sidecars included.
    const quarantined = `${file.slice(0, -3)}.corrupt-${timestamp()}.db`

    try {
        fs.renameSync(file, quarantined)
        for (const suffix of ['-wal', '-shm']) {
            if (fs.existsSync(file + suffix)) {
                fs.renameSync(file + suffix, quarantined + suffix)
            }
        }
    } catch (err) {
        return {
            recovered: false,
            reason: `could not move the damaged database aside: ${(err as Error).message}`,
        }
    }

    logger.warn(`Damaged database preserved as [${path.basename(quarantined)}]`)
    logger.info('Rebuilding with sqlite3 .recover, this can take a few minutes')

    // 2. Stream `.recover` output straight into a fresh database.
    const rebuilt = `${file.slice(0, -3)}.recovered.db`
    fs.rmSync(rebuilt, { force: true })

    try {
        const dump = spawn('sqlite3', [quarantined, '.recover'], {
            windowsHide: true,
        })

        let dumpError = ''
        dump.stderr.on('data', chunk => {
            if (dumpError.length < 4096) dumpError += chunk.toString()
        })

        const load = await run('sqlite3', [rebuilt], { stdin: dump.stdout })

        if (load.code !== 0) {
            return {
                recovered: false,
                quarantinedAs: quarantined,
                reason: `rebuilding failed: ${load.stderr.trim() || dumpError.trim() || `exit ${load.code}`}`,
            }
        }
    } catch (err) {
        return {
            recovered: false,
            quarantinedAs: quarantined,
            reason: `rebuilding failed: ${(err as Error).message}`,
        }
    }

    if (!fs.existsSync(rebuilt)) {
        return {
            recovered: false,
            quarantinedAs: quarantined,
            reason: 'rebuilding produced no output',
        }
    }

    // 3. Drop the scratch table and confirm the result is actually sound.
    const verify = await run('sqlite3', [
        rebuilt,
        `drop table if exists ${RECOVERY_SCRATCH_TABLE};`,
    ])

    if (verify.code !== 0) {
        logger.warn(`Could not drop ${RECOVERY_SCRATCH_TABLE}: ${verify.stderr}`)
    }

    const check = await run('sqlite3', [rebuilt, 'pragma integrity_check;'])
    const verdict = check.stdout.trim().split('\n')[0]

    if (verdict !== 'ok') {
        return {
            recovered: false,
            quarantinedAs: quarantined,
            reason: `the rebuilt database is still not sound: ${verdict || check.stderr.trim()}`,
        }
    }

    // 4. Put it in place.
    const counts = await run('sqlite3', [
        rebuilt,
        "select name from sqlite_master where type='table' and name not like 'sqlite_%';",
    ])
    const rows: { table: string; count: number }[] = []

    for (const table of counts.stdout.trim().split('\n').filter(Boolean)) {
        const result = await run('sqlite3', [
            rebuilt,
            `select count(*) from "${table}";`,
        ])
        rows.push({ table, count: Number(result.stdout.trim()) || 0 })
    }

    try {
        fs.renameSync(rebuilt, file)
    } catch (err) {
        return {
            recovered: false,
            quarantinedAs: quarantined,
            reason: `could not put the rebuilt database in place: ${(err as Error).message}`,
        }
    }

    return {
        recovered: true,
        quarantinedAs: quarantined,
        rows,
        elapsedMs: Date.now() - startedAt,
    }
}
