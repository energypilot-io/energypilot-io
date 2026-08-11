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
 * `snapshot.created_at` shifted into server-local wall clock time.
 *
 * SQLite has no timezone type, so the UTC offset is resolved per row via the
 * `localtime` modifier. Doing it per row rather than once per query is what
 * keeps DST transitions correct: on the day Europe falls back the local day is
 * 25 hours long, and every one of those rows still lands in the same bucket.
 *
 * Assumes the snapshot alias is `s`.
 */
const LOCAL_MS = `(cast(strftime('%s', s.created_at / 1000, 'unixepoch', 'localtime') as integer) * 1000)`

/**
 * Grouping key — the index of the local bucket a row falls into.
 */
export function bucketKey(size: number): string {
    return `(${LOCAL_MS} / ${size})`
}

/**
 * The instant a row's local bucket started, as a real (UTC) epoch timestamp.
 *
 * Only correct when evaluated on the *earliest* row of a bucket, because a
 * bucket spanning a DST change contains rows at two different offsets. Callers
 * must therefore wrap this in `min(...)` or `first_value(... order by asc)`.
 */
export function bucketStart(size: number): string {
    return `(s.created_at - (${LOCAL_MS} - (${LOCAL_MS} / ${size}) * ${size}))`
}

function floorToLocalBucket(value: Date, size: number): Date {
    const result = new Date(value)

    result.setMilliseconds(0)
    result.setSeconds(0)
    result.setMinutes(0)
    if (size === DAY_MS) result.setHours(0)

    return result
}

function nextLocalBucket(value: Date, size: number): Date {
    const result = floorToLocalBucket(value, size)

    if (size === DAY_MS) {
        result.setDate(result.getDate() + 1)
    } else {
        result.setHours(result.getHours() + 1)
    }

    return result
}

export interface BucketRange {
    from: Date
    to: Date
}

/**
 * Reads the `created_at` range MikroORM is about to apply to a virtual entity
 * and widens it to whole local bucket edges.
 *
 * The widening is what keeps the rewritten views equivalent to the old ones.
 * MikroORM filters on the *bucket* timestamp of the outer query, so a bucket is
 * either fully in the result or not in it at all — and a bucket that is in must
 * have been aggregated over all of its rows. Filtering the inner query on the
 * raw `snapshot.created_at` instead would clip the first and last bucket to
 * whatever part of them the requested window happens to cover.
 *
 * Using local `Date` arithmetic here (rather than dividing epoch milliseconds)
 * keeps the edges on real local midnights across DST.
 */
export function widenToLocalBuckets(
    where: unknown,
    size: number
): BucketRange | undefined {
    // `ObjectQuery` describes a recursive union of operators; narrowing it
    // properly here would cost more than the one property we actually read.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const condition = (where as any)?.created_at

    if (condition == null) return undefined

    if (condition instanceof Date) {
        return {
            from: floorToLocalBucket(condition, size),
            to: new Date(nextLocalBucket(condition, size).getTime() - 1),
        }
    }

    const from = condition.$gte ?? condition.$gt
    const to = condition.$lte ?? condition.$lt

    if (!(from instanceof Date) || !(to instanceof Date)) return undefined

    return {
        from: floorToLocalBucket(from, size),
        to: new Date(nextLocalBucket(to, size).getTime() - 1),
    }
}

/**
 * Renders the pushed-down range predicate. Returning an always-true predicate
 * when the range is unknown keeps the SQL valid; callers are expected to always
 * supply a window (see `findSnapshotsBetweenDates`).
 */
export function rangePredicate(range: BucketRange | undefined): string {
    if (range === undefined) return '1 = 1'

    return `s.created_at >= ${range.from.getTime()} and s.created_at <= ${range.to.getTime()}`
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
