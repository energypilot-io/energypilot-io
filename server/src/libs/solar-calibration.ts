import {
    addMinutes,
    differenceInCalendarDays,
    startOfHour,
    subHours,
    subMinutes,
} from 'date-fns'

export type ForecastDay = {
    [datetime: string]: { wattHoursPeriod: number; wattHours: number }
}

export type ForecastData = {
    [day: string]: ForecastDay
}

/**
 * Learned correction of the solar forecast, bound to the elevation of the sun
 * instead of the time of day. Binding to the elevation is what makes the
 * correction generalize across the seasons: 08:00 in June and 08:00 in
 * December are not comparable, 15 degrees of sun elevation are.
 *
 * Every elevation bin exists twice, once for the rising and once for the
 * falling branch of the sun's path. The same elevation is reached twice a day
 * and the asymmetry between both passes (morning shading for example) is
 * exactly the information a single scalar factor cannot represent.
 */
export type CalibrationFactors = {
    latitude: number
    longitude: number

    /** Correction factor per bin key, see makeBinKey(). */
    factors: { [binKey: string]: number }

    /** Number of hourly samples the factor of a bin was derived from. */
    sampleCounts: { [binKey: string]: number }

    /**
     * Correction learned from all samples regardless of their bin. Used for
     * bins that have no samples of their own, and as the prior every bin is
     * shrunk towards while it is still thinly covered.
     */
    globalFactor: number

    /** Total number of hourly samples the calibration was learned from. */
    samples: number

    /** Number of days that contributed at least one sample. */
    days: number

    updatedAt: string
}

/**
 * Width of an elevation bin in degrees.
 *
 * The forecast has one entry per hour, and around the middle of the day the sun
 * moves through roughly 10 degrees of elevation per hour. Narrower bins are
 * therefore finer than the data feeding them: with 5 degree bins every second
 * bin is jumped over completely on any given day, and the bins that are hit
 * collect a single sample per day.
 */
const ELEVATION_BIN_SIZE_DEG = 10

/**
 * Hours whose forecast is below this threshold are ignored while learning.
 * Their ratio would be a division by noise rather than a measurement.
 */
const MIN_FORECAST_WATT_HOURS = 50

/**
 * Number of samples over all bins needed before any correction is derived.
 * Roughly a day and a half of production hours - below that the ratios are
 * still an anecdote rather than a measurement.
 */
const MIN_SAMPLES_TOTAL = 20

/**
 * Weight of the global factor when a bin is shrunk towards it, expressed in
 * samples. A bin holding this many samples of its own is trusted half by
 * itself and half by the global factor.
 *
 * Shrinking rather than thresholding is what lets the calibration start
 * working on the second day: a bin never has to earn its own factor before it
 * contributes anything, and no bin can produce a step in the corrected curve
 * just because it happened to cross a sample count.
 */
const SHRINKAGE_SAMPLES = 5

/**
 * Quantile of the per bin ratios used as its correction.
 *
 * The median is the robust centre of the distribution, which is what is wanted
 * here: forecast.solar already folds the weather forecast into its estimate, so
 * the ratio scatters around the plant's systematic deviation (shading, tilt,
 * clipping, degradation) and a robust centre estimates exactly that. Clouds
 * only ever push single ratios down, so a higher quantile would deliberately
 * bias the corrected forecast upwards - that is the right choice only against a
 * pure clear sky model, which this is not.
 */
const RATIO_QUANTILE = 0.5

/**
 * Plausible range of a correction factor. Clamping keeps a single outlier from
 * burning itself permanently into a bin.
 */
const MIN_FACTOR = 0.5
const MAX_FACTOR = 1.5

/** How far to look for a neighbouring bin when a bin has no own factor. */
const MAX_NEIGHBOUR_BIN_DISTANCE = 2

/**
 * How far the plant may have moved before a stored calibration is discarded.
 * The factors are bound to the sun path of the location they were learned at,
 * so they cannot be carried over to a different one. Roughly a kilometre.
 */
const MAX_LOCATION_DRIFT_DEG = 0.01

/**
 * A stored calibration older than this is dropped instead of restored. It only
 * ever matters when the server was down for that long, in which case the
 * factors describe a season that has since moved on.
 */
const MAX_CALIBRATION_AGE_DAYS = 30

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** Days between the unix epoch and the J2000.0 epoch (2000-01-01 12:00 UTC). */
const DAYS_UNIX_EPOCH_TO_J2000 = 10957.5

const MILLISECONDS_PER_DAY = 86400000

/**
 * Returns the elevation of the sun in degrees above the horizon for the given
 * instant and location. Implements the low precision solar position formulas
 * of the astronomical almanac, which are accurate to well below a tenth of a
 * degree - far more than the 5 degree bins need.
 */
export function getSolarElevation(
    date: Date,
    latitude: number,
    longitude: number
): number {
    const daysSinceJ2000 =
        date.getTime() / MILLISECONDS_PER_DAY - DAYS_UNIX_EPOCH_TO_J2000

    const meanLongitude = 280.46 + 0.9856474 * daysSinceJ2000
    const meanAnomaly = (357.528 + 0.9856003 * daysSinceJ2000) * DEG_TO_RAD

    const eclipticLongitude =
        (meanLongitude +
            1.915 * Math.sin(meanAnomaly) +
            0.02 * Math.sin(2 * meanAnomaly)) *
        DEG_TO_RAD

    const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * DEG_TO_RAD

    const declination = Math.asin(
        Math.sin(obliquity) * Math.sin(eclipticLongitude)
    )

    const rightAscension = Math.atan2(
        Math.cos(obliquity) * Math.sin(eclipticLongitude),
        Math.cos(eclipticLongitude)
    )

    // Greenwich mean sidereal time in degrees.
    const siderealTime = 280.46061837 + 360.98564736629 * daysSinceJ2000

    const hourAngle =
        (siderealTime + longitude - rightAscension * RAD_TO_DEG) * DEG_TO_RAD

    const latitudeRad = latitude * DEG_TO_RAD

    const sinElevation =
        Math.sin(latitudeRad) * Math.sin(declination) +
        Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle)

    return Math.asin(Math.min(Math.max(sinElevation, -1), 1)) * RAD_TO_DEG
}

type SunBranch = 'r' | 'f'

function makeBinKey(branch: SunBranch, binIndex: number): string {
    return `${branch}:${binIndex}`
}

function parseBinKey(
    binKey: string
): { branch: SunBranch; binIndex: number } | undefined {
    const [branch, binIndex] = binKey.split(':')

    if ((branch !== 'r' && branch !== 'f') || binIndex === undefined)
        return undefined

    const parsedBinIndex = Number.parseInt(binIndex)

    return Number.isNaN(parsedBinIndex)
        ? undefined
        : { branch, binIndex: parsedBinIndex }
}

/**
 * Returns the calibration bin for the given instant, or undefined when the sun
 * is below the horizon. The branch is derived by looking a few minutes ahead:
 * a rising elevation means the sun has not passed its daily maximum yet.
 */
export function getElevationBin(
    date: Date,
    latitude: number,
    longitude: number
): string | undefined {
    const elevation = getSolarElevation(date, latitude, longitude)

    if (elevation <= 0) return undefined

    const elevationAhead = getSolarElevation(
        addMinutes(date, 10),
        latitude,
        longitude
    )

    const branch: SunBranch = elevationAhead > elevation ? 'r' : 'f'

    return makeBinKey(branch, Math.floor(elevation / ELEVATION_BIN_SIZE_DEG))
}

/**
 * The instant a forecast entry is representative for. forecast.solar reports
 * wattHoursPeriod as the energy accumulated since the previous entry, so the
 * entry timestamped 13:00 covers 12:00 - 13:00. The middle of that period is
 * what the elevation is evaluated at.
 */
function getPeriodCenter(periodEnd: Date): Date {
    return subMinutes(periodEnd, 30)
}

/** Start of the hour a forecast entry covers, used to match the actual values. */
function getPeriodStart(periodEnd: Date): Date {
    return startOfHour(subHours(periodEnd, 1))
}

/** Linearly interpolated quantile of an unsorted sample. */
function quantile(values: number[], q: number): number {
    const sorted = [...values].sort((a, b) => a - b)

    if (sorted.length === 1) return sorted[0]

    const position = (sorted.length - 1) * q
    const lower = Math.floor(position)
    const upper = Math.ceil(position)

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function clampFactor(factor: number): number {
    return Math.min(Math.max(factor, MIN_FACTOR), MAX_FACTOR)
}

/**
 * Learns the correction factors from the raw forecast history and the measured
 * PV production of the same period.
 *
 * @param actualWattHoursByHour Measured production in watt hours, keyed by the
 * epoch milliseconds of the start of the hour.
 */
export function computeCalibrationFactors(params: {
    forecastHistory: ForecastData
    actualWattHoursByHour: { [hourStart: number]: number }
    latitude: number
    longitude: number
}): CalibrationFactors {
    const ratiosByBin: { [binKey: string]: number[] } = {}
    const allRatios: number[] = []
    const contributingDays = new Set<string>()

    Object.entries(params.forecastHistory).forEach(([day, dayForecast]) => {
        Object.entries(dayForecast).forEach(([timestamp, entry]) => {
            const periodEnd = new Date(timestamp)

            if (Number.isNaN(periodEnd.getTime())) return

            // Learning from hours with a negligible forecast would divide by
            // noise instead of measuring a systematic deviation.
            if (
                !Number.isFinite(entry?.wattHoursPeriod) ||
                entry.wattHoursPeriod < MIN_FORECAST_WATT_HOURS
            )
                return

            const actualWattHours =
                params.actualWattHoursByHour[
                    getPeriodStart(periodEnd).getTime()
                ]

            if (actualWattHours === undefined) return

            const binKey = getElevationBin(
                getPeriodCenter(periodEnd),
                params.latitude,
                params.longitude
            )

            if (!binKey) return

            if (!(binKey in ratiosByBin)) ratiosByBin[binKey] = []

            const ratio = actualWattHours / entry.wattHoursPeriod

            ratiosByBin[binKey].push(ratio)
            allRatios.push(ratio)
            contributingDays.add(day)
        })
    })

    const sampleCounts: { [binKey: string]: number } = {}

    Object.entries(ratiosByBin).forEach(([binKey, ratios]) => {
        sampleCounts[binKey] = ratios.length
    })

    const factors: { [binKey: string]: number } = {}

    // Below this the sample says more about the last two days of weather than
    // about the plant, so nothing is corrected at all.
    const globalFactor =
        allRatios.length >= MIN_SAMPLES_TOTAL
            ? clampFactor(quantile(allRatios, RATIO_QUANTILE))
            : 1

    if (allRatios.length >= MIN_SAMPLES_TOTAL) {
        Object.entries(ratiosByBin).forEach(([binKey, ratios]) => {
            // Every bin gets a factor, weighted between what it measured
            // itself and the global factor by how much it has actually seen.
            factors[binKey] = clampFactor(
                (ratios.length * quantile(ratios, RATIO_QUANTILE) +
                    SHRINKAGE_SAMPLES * globalFactor) /
                    (ratios.length + SHRINKAGE_SAMPLES)
            )
        })
    }

    return {
        latitude: params.latitude,
        longitude: params.longitude,
        factors,
        sampleCounts,
        globalFactor,
        samples: allRatios.length,
        days: contributingDays.size,
        updatedAt: new Date().toISOString(),
    }
}

/**
 * Reads a stored calibration back, or returns undefined when it cannot be used
 * as it stands.
 *
 * A calibration is only valid for the location and the period it was learned
 * at: the factors are bound to the sun path over that plant. Anything that does
 * not match - a different location, a calibration left behind by an earlier
 * version, an entry that sat in the storage while the server was down for a
 * month - is dropped rather than adapted, and relearned from the history.
 */
export function parseCalibrationFactors(
    storedValue: string,
    latitude: number,
    longitude: number
): CalibrationFactors | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedValue: any

    try {
        parsedValue = JSON.parse(storedValue)
    } catch {
        return undefined
    }

    if (parsedValue === null || typeof parsedValue !== 'object')
        return undefined

    if (
        !Number.isFinite(parsedValue.globalFactor) ||
        !Number.isFinite(parsedValue.latitude) ||
        !Number.isFinite(parsedValue.longitude) ||
        parsedValue.factors === null ||
        typeof parsedValue.factors !== 'object'
    )
        return undefined

    if (
        Math.abs(parsedValue.latitude - latitude) > MAX_LOCATION_DRIFT_DEG ||
        Math.abs(parsedValue.longitude - longitude) > MAX_LOCATION_DRIFT_DEG
    )
        return undefined

    const updatedAt = new Date(parsedValue.updatedAt)

    if (
        Number.isNaN(updatedAt.getTime()) ||
        differenceInCalendarDays(new Date(), updatedAt) >
            MAX_CALIBRATION_AGE_DAYS
    )
        return undefined

    const factors: { [binKey: string]: number } = {}

    Object.entries(parsedValue.factors).forEach(([binKey, factor]) => {
        if (parseBinKey(binKey) === undefined || !Number.isFinite(factor))
            return

        factors[binKey] = clampFactor(factor as number)
    })

    return {
        latitude: parsedValue.latitude,
        longitude: parsedValue.longitude,
        factors,
        sampleCounts: {},
        globalFactor: clampFactor(parsedValue.globalFactor),
        samples: Number.isFinite(parsedValue.samples) ? parsedValue.samples : 0,
        days: Number.isFinite(parsedValue.days) ? parsedValue.days : 0,
        updatedAt: updatedAt.toISOString(),
    }
}

/**
 * Returns the factor for a bin, falling back to the closest neighbouring bin of
 * the same branch that has one, and to the global factor when even that is
 * missing. Correcting an uncovered bin by 1 while its neighbours are corrected
 * would put a visible step into the curve.
 */
function getFactorForBin(
    binKey: string | undefined,
    factors: CalibrationFactors
): number {
    if (!binKey) return factors.globalFactor

    if (binKey in factors.factors) return factors.factors[binKey]

    const bin = parseBinKey(binKey)

    if (!bin) return factors.globalFactor

    for (let distance = 1; distance <= MAX_NEIGHBOUR_BIN_DISTANCE; distance++) {
        for (const offset of [-distance, distance]) {
            const neighbourIndex = bin.binIndex + offset

            if (neighbourIndex < 0) continue

            const neighbourKey = makeBinKey(bin.branch, neighbourIndex)

            if (neighbourKey in factors.factors)
                return factors.factors[neighbourKey]
        }
    }

    return factors.globalFactor
}

function round(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Applies the learned correction to a forecast. The cumulated wattHours are
 * rebuilt from the corrected periods so both series stay consistent.
 *
 * The input is never modified: the raw forecast stays the single source the
 * calibration is learned from, otherwise the correction would compound over
 * the days.
 */
export function applyCalibrationFactors(
    forecastData: ForecastData,
    factors: CalibrationFactors
): ForecastData {
    const calibratedForecast: ForecastData = {}

    Object.entries(forecastData).forEach(([day, dayForecast]) => {
        const calibratedDay: ForecastDay = {}

        let cumulatedWattHours = 0

        Object.keys(dayForecast)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .forEach((timestamp) => {
                const entry = dayForecast[timestamp]
                const periodEnd = new Date(timestamp)

                const factor = Number.isNaN(periodEnd.getTime())
                    ? 1
                    : getFactorForBin(
                          getElevationBin(
                              getPeriodCenter(periodEnd),
                              factors.latitude,
                              factors.longitude
                          ),
                          factors
                      )

                const wattHoursPeriod = entry.wattHoursPeriod * factor
                cumulatedWattHours += wattHoursPeriod

                calibratedDay[timestamp] = {
                    wattHoursPeriod: round(wattHoursPeriod),
                    wattHours: round(cumulatedWattHours),
                }
            })

        calibratedForecast[day] = calibratedDay
    })

    return calibratedForecast
}
