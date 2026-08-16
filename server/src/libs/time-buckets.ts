export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

/**
 * The value names that carry a cumulative energy counter, as written by the
 * snapshot manager. The daily view used to match these with `like '%energy%'`,
 * which can never use an index; an explicit list is sargable. Keep in sync with
 * the names pushed in `pollData()`.
 */
export const ENERGY_VALUE_NAMES = ['energy', 'energy_import', 'energy_export']

/**
 * How far outside the requested window to look for UTC offset changes. A couple
 * of days on either side comfortably covers the bucket widening plus any
 * transition sitting right on an edge.
 */
const TRANSITION_MARGIN_MS = 2 * DAY_MS

const _formatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The zone snapshots are bucketed into — an hourly or daily total only means
 * anything relative to somebody's wall clock. EnergyPilot is self-hosted, so
 * the server and the browser sit in the same zone, and that zone is simply
 * wherever the installation is: set `TZ` in the container to pick it.
 *
 * Read per call rather than cached so a `TZ` change takes effect on restart
 * without any further plumbing.
 */
export function deploymentTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
    let formatter = _formatters.get(timeZone)

    if (formatter === undefined) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
        _formatters.set(timeZone, formatter)
    }

    return formatter
}

/**
 * The same instant expressed as wall clock time in the target zone, returned as
 * if that reading were UTC. Bucket arithmetic happens entirely in this
 * projection, where every day is exactly `DAY_MS` long regardless of DST.
 */
function toLocalProjection(
    timestamp: number,
    formatter: Intl.DateTimeFormat
): number {
    const parts: Record<string, number> = {}

    for (const { type, value } of formatter.formatToParts(new Date(timestamp))) {
        if (type !== 'literal') parts[type] = Number(value)
    }

    return Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    )
}

/** UTC offset in milliseconds applying at `timestamp` in the target zone. */
function offsetAt(timestamp: number, formatter: Intl.DateTimeFormat): number {
    return (
        toLocalProjection(timestamp, formatter) -
        Math.floor(timestamp / 1000) * 1000
    )
}

interface OffsetTransition {
    /** First instant at which `offset` applies. */
    at: number
    offset: number
}

/**
 * Every UTC offset change between `from` and `to`, found by walking the range a
 * day at a time and bisecting wherever the offset differs. Two transitions can
 * never fall inside the same day, so a daily probe cannot miss one.
 */
function findTransitions(
    from: number,
    to: number,
    formatter: Intl.DateTimeFormat
): OffsetTransition[] {
    const transitions: OffsetTransition[] = []

    let previous = offsetAt(from, formatter)
    let cursor = from

    while (cursor < to) {
        const next = Math.min(cursor + DAY_MS, to)
        const offset = offsetAt(next, formatter)

        if (offset !== previous) {
            let low = cursor
            let high = next

            // Bisect to the second; transitions never land mid-second.
            while (high - low > 1000) {
                const middle = low + Math.floor((high - low) / 2000) * 1000
                if (middle <= low) break

                if (offsetAt(middle, formatter) === previous) {
                    low = middle
                } else {
                    high = middle
                }
            }

            transitions.push({ at: high, offset })
            previous = offset
        }

        cursor = next
    }

    return transitions
}

export interface BucketContext {
    timeZone: string
    /** SQL yielding the UTC offset in ms that applies to each snapshot row. */
    offsetSql: string
    /** Widened, bucket-aligned range to push into the inner query. */
    range: { from: number; to: number } | undefined
}

/**
 * Works out the pushdown range and the per-row offset expression for one query.
 *
 * Offsets are resolved here, in Node, and emitted as a `case` over the handful
 * of transitions inside the window — SQLite's own `localtime` modifier is
 * deliberately not used. It reads the C library's zone database, which the
 * `node:*-alpine` image does not ship, so it silently answers in UTC while
 * Node's bundled ICU answers correctly; the two halves of the same query would
 * then disagree. Resolving offsets in one place removes that failure mode, and
 * collapses the SQL to integer comparisons instead of a `localtime_r` call per
 * row.
 */
export function bucketContext(where: unknown, size: number): BucketContext {
    const timeZone = deploymentTimeZone()
    const formatter = formatterFor(timeZone)
    const requested = readRequestedRange(where)

    if (requested === undefined) {
        // No window to work from; bucket with a single current offset. Callers
        // are expected to always supply a range.
        return {
            timeZone,
            offsetSql: String(offsetAt(Date.now(), formatter)),
            range: undefined,
        }
    }

    const scanFrom = requested.from - TRANSITION_MARGIN_MS
    const scanTo = requested.to + TRANSITION_MARGIN_MS

    const baseOffset = offsetAt(scanFrom, formatter)
    const transitions = findTransitions(scanFrom, scanTo, formatter)
    const offsets = [baseOffset, ...transitions.map(t => t.offset)]

    // Bucket edges are computed in the local projection, where each bucket is
    // exactly `size` long, then converted back using the widest offset in play.
    // Erring outwards is safe — the outer `where` MikroORM adds trims to the
    // exact bucket — whereas erring inwards would clip an edge bucket.
    const fromProjected =
        Math.floor(toLocalProjection(requested.from, formatter) / size) * size
    const toProjected =
        Math.floor(toLocalProjection(requested.to, formatter) / size) * size +
        size

    return {
        timeZone,
        offsetSql: buildOffsetSql(baseOffset, transitions),
        range: {
            from: fromProjected - Math.max(...offsets),
            to: toProjected - Math.min(...offsets) - 1,
        },
    }
}

function buildOffsetSql(
    baseOffset: number,
    transitions: OffsetTransition[]
): string {
    if (transitions.length === 0) return String(baseOffset)

    const branches = transitions
        .map((transition, index) => {
            const before = index === 0 ? baseOffset : transitions[index - 1].offset
            return `when s.created_at < ${transition.at} then ${before}`
        })
        .join(' ')

    const last = transitions[transitions.length - 1].offset

    return `(case ${branches} else ${last} end)`
}

function readRequestedRange(
    where: unknown
): { from: number; to: number } | undefined {
    // `ObjectQuery` describes a recursive union of operators; narrowing it
    // properly here would cost more than the one property we actually read.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const condition = (where as any)?.created_at

    if (condition == null) return undefined

    if (condition instanceof Date) {
        return { from: condition.getTime(), to: condition.getTime() }
    }

    const from = condition.$gte ?? condition.$gt
    const to = condition.$lte ?? condition.$lt

    if (!(from instanceof Date) || !(to instanceof Date)) return undefined

    return { from: from.getTime(), to: to.getTime() }
}

/** Grouping key — the index of the local bucket a row falls into. */
export function bucketKey(size: number, offsetSql: string): string {
    return `((s.created_at + ${offsetSql}) / ${size})`
}

/**
 * The instant a row's local bucket started, as a real (UTC) timestamp.
 *
 * Only correct on the *earliest* row of a bucket, since a bucket spanning a
 * transition holds rows at two different offsets. Callers must wrap this in
 * `min(...)` or `first_value(... order by asc)`.
 */
export function bucketStart(size: number, offsetSql: string): string {
    return `(((s.created_at + ${offsetSql}) / ${size}) * ${size} - ${offsetSql})`
}

/** Renders the pushed-down range predicate. */
export function rangePredicate(context: BucketContext): string {
    if (context.range === undefined) return '1 = 1'

    return `s.created_at >= ${context.range.from} and s.created_at <= ${context.range.to}`
}

/**
 * Wraps a virtual entity's SQL builder for the `expression` option.
 *
 * The driver accepts a raw SQL string from this callback and wraps it in a
 * subquery, still applying the outer `where`, `orderBy` and `limit` itself — but
 * the public option type only declares a return of `object`, so the assignment
 * needs a cast. Doing it here keeps the entity definitions free of it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sqlExpression(build: (where: unknown) => string): any {
    return (_em: unknown, where: unknown) => build(where)
}
