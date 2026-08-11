import {
    getDataFromStorage,
    writeDataToStorage,
} from '@/core/data-storage-manager.js'
import got from 'got'

import {
    differenceInCalendarDays,
    endOfDay,
    format,
    isAfter,
    isBefore,
    parse,
    startOfDay,
    startOfHour,
    subDays,
} from 'date-fns'
import schedule from 'node-schedule'
import { SettingChangeObserver } from '@/observers/setting-change-observer.js'
import { ModuleBase } from './module-base.js'
import { toISOStringWithTimezone } from '@/libs/utils.js'
import {
    applyCalibrationFactors,
    CalibrationFactors,
    computeCalibrationFactors,
    ForecastData,
    ForecastDay,
} from '@/libs/solar-calibration.js'
import { findSnapshotsBetweenDates } from '@/core/snapshot-manager.js'
import { PVDevice } from '@/devices/pv-device.js'

const MIN_FORECAST_LATITUDE = -90
const MAX_FORECAST_LATITUDE = 90

const MIN_FORECAST_LONGITUDE = -180
const MAX_FORECAST_LONGITUDE = 180

const MIN_FORECAST_DECLINATION = 0
const MAX_FORECAST_DECLINATION = 90

const MIN_FORECAST_AZIMUTH = -180
const MAX_FORECAST_AZIMUTH = 180

const MIN_FORECAST_MAXKWP = 1

const DATA_STORAGE_KEY = 'forecast.data'
const CALIBRATION_DATA_STORAGE_KEY = 'forecast.calibration'

// Number of past days the calibration layer learns from. The same window is
// used for the forecast history and for the measured PV values.
const CALIBRATION_MAX_DAYS = 30

// Keys of the per-day forecast structure, e.g. "2026-08-10".
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Accumulated forecast data, keyed by day. Holds both the historized past
// days and the current forecast window (today and upcoming days). Kept in
// sync with the single DATA_STORAGE_KEY entry in the data storage.
//
// Always holds the raw forecast as it was received from the API. The
// calibration is applied when the data is handed out, so that it is always
// learned against the uncorrected forecast instead of compounding over the
// days.
let _forecastData: ForecastData = {}

let _calibrationEnabled: boolean = false
let _calibrationFactors: CalibrationFactors | undefined = undefined

// Shape of an hourly grouped snapshot as returned by the snapshot manager.
type HourlySnapshot = {
    created_at: Date
    device_snapshots: {
        device_type: string
        name: string
        value: number
    }[]
}

export class SolarForecastModule
    extends ModuleBase
    implements SettingChangeObserver
{
    static MODULE_NAME = 'solar_forecast'

    static SETTING_FORECAST_LATITUDE =
        SolarForecastModule.MODULE_NAME + '.latitude'
    static SETTING_FORECAST_LONGITUDE =
        SolarForecastModule.MODULE_NAME + '.longitude'
    static SETTING_FORECAST_DECLINATION =
        SolarForecastModule.MODULE_NAME + '.declination'
    static SETTING_FORECAST_AZIMUTH =
        SolarForecastModule.MODULE_NAME + '.azimuth'
    static SETTING_FORECAST_MAXKWP =
        SolarForecastModule.MODULE_NAME + '.max_kwp'
    static SETTING_FORECAST_CALIBRATION_ENABLED =
        SolarForecastModule.MODULE_NAME + '.calibration_enabled'

    private _latitude: number | undefined = undefined
    private _longitude: number | undefined = undefined
    private _declination: number | undefined = undefined
    private _azimuth: number | undefined = undefined
    private _maxKWP: number | undefined = undefined

    /*
     * SettingChangeObserver
     */

    getObservedSettings(): string[] {
        return [
            ...super.getObservedSettings(),
            SolarForecastModule.SETTING_FORECAST_LATITUDE,
            SolarForecastModule.SETTING_FORECAST_LONGITUDE,
            SolarForecastModule.SETTING_FORECAST_DECLINATION,
            SolarForecastModule.SETTING_FORECAST_AZIMUTH,
            SolarForecastModule.SETTING_FORECAST_MAXKWP,
            SolarForecastModule.SETTING_FORECAST_CALIBRATION_ENABLED,
        ]
    }

    onSettingChange(name: string, value?: any): boolean {
        if (!this.getObservedSettings().includes(name) || value === undefined)
            return false

        // Handled before the numeric parsing below, which would turn a boolean
        // into NaN.
        if (name === SolarForecastModule.SETTING_FORECAST_CALIBRATION_ENABLED) {
            const newValue = value === '1' || value === 1 || value === true

            if (_calibrationEnabled === newValue) return false

            _calibrationEnabled = newValue

            this._logger.info(
                `Solar forecast calibration ${newValue ? 'enabled' : 'disabled'}`
            )

            // The calibration is applied when the forecast is handed out, so
            // toggling it never needs another request against the API.
            if (newValue) {
                this.restoreCalibration().then(() => this.updateCalibration())
            } else {
                _calibrationFactors = undefined
            }

            return true
        }

        const parsedValue = Number.parseFloat(value.toString())

        let isDirty: boolean = false

        switch (name) {
            case SolarForecastModule.SETTING_FORECAST_LATITUDE: {
                const newValue = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_LATITUDE),
                    MAX_FORECAST_LATITUDE
                )

                if (!this._latitude || this._latitude !== newValue) {
                    this._latitude = newValue
                    isDirty = true
                }
                break
            }

            case SolarForecastModule.SETTING_FORECAST_LONGITUDE: {
                const newValue = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_LONGITUDE),
                    MAX_FORECAST_LONGITUDE
                )

                if (!this._longitude || this._longitude !== newValue) {
                    this._longitude = newValue
                    isDirty = true
                }
                break
            }

            case SolarForecastModule.SETTING_FORECAST_DECLINATION: {
                const newValue = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_DECLINATION),
                    MAX_FORECAST_DECLINATION
                )

                if (!this._declination || this._declination !== newValue) {
                    this._declination = newValue
                    isDirty = true
                }
                break
            }

            case SolarForecastModule.SETTING_FORECAST_AZIMUTH: {
                const newValue = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_AZIMUTH),
                    MAX_FORECAST_AZIMUTH
                )

                if (!this._azimuth || this._azimuth !== newValue) {
                    this._azimuth = newValue
                    isDirty = true
                }
                break
            }

            case SolarForecastModule.SETTING_FORECAST_MAXKWP: {
                const newValue = Math.max(parsedValue, MIN_FORECAST_MAXKWP)

                if (!this._maxKWP || this._maxKWP !== newValue) {
                    this._maxKWP = newValue
                    isDirty = true
                }
                break
            }

            default: {
                isDirty = super.onSettingChange(name, value)
                break
            }
        }

        if (isDirty) this.requestForecast(true)

        return isDirty
    }

    /*
     * ModuleBase
     */

    static getSettings(): any {
        const settings: any = super.getSettings(SolarForecastModule.MODULE_NAME)

        settings[SolarForecastModule.MODULE_NAME] = [
            ...settings[SolarForecastModule.MODULE_NAME],
            ...[
                {
                    group: `${SolarForecastModule.MODULE_NAME}.forecast`,
                    schema: {
                        type: 'object',
                        properties: {
                            [SolarForecastModule.SETTING_FORECAST_LATITUDE]: {
                                type: 'number',
                                minimum: MIN_FORECAST_LATITUDE,
                                maximum: MAX_FORECAST_LATITUDE,
                            },

                            [SolarForecastModule.SETTING_FORECAST_LONGITUDE]: {
                                type: 'number',
                                minimum: MIN_FORECAST_LONGITUDE,
                                maximum: MAX_FORECAST_LONGITUDE,
                            },

                            [SolarForecastModule.SETTING_FORECAST_DECLINATION]:
                                {
                                    type: 'number',
                                    minimum: MIN_FORECAST_DECLINATION,
                                    maximum: MAX_FORECAST_DECLINATION,

                                    widget: {
                                        formlyConfig: {
                                            props: {
                                                addonRight: {
                                                    text: 'deg',
                                                },
                                            },
                                        },
                                    },
                                },

                            [SolarForecastModule.SETTING_FORECAST_AZIMUTH]: {
                                type: 'number',
                                minimum: MIN_FORECAST_AZIMUTH,
                                maximum: MAX_FORECAST_AZIMUTH,

                                widget: {
                                    formlyConfig: {
                                        props: {
                                            addonRight: {
                                                text: 'deg',
                                            },
                                        },
                                    },
                                },
                            },

                            [SolarForecastModule.SETTING_FORECAST_MAXKWP]: {
                                type: 'number',
                                minimum: MIN_FORECAST_MAXKWP,

                                widget: {
                                    formlyConfig: {
                                        props: {
                                            addonRight: {
                                                text: 'kWp',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                {
                    group: `${SolarForecastModule.MODULE_NAME}.calibration`,
                    schema: {
                        type: 'object',
                        properties: {
                            [SolarForecastModule.SETTING_FORECAST_CALIBRATION_ENABLED]:
                                {
                                    type: 'boolean',
                                    default: false,

                                    widget: {
                                        formlyConfig: {
                                            props: {
                                                formCheck: 'switch',
                                            },
                                        },
                                    },
                                },
                        },
                    },
                },
            ],
        ]

        return settings
    }

    /*
     * Solar Forecast Module
     */
    constructor() {
        super(SolarForecastModule.MODULE_NAME)

        const recurrenceRule = new schedule.RecurrenceRule()
        recurrenceRule.hour = 0
        recurrenceRule.minute = 10

        schedule.scheduleJob(recurrenceRule, () => this.requestForecast())
    }

    getModuleName(): string {
        return SolarForecastModule.MODULE_NAME
    }

    start(): void {
        // Restore the previously learned factors first, so that a restart does
        // not serve an uncalibrated forecast until the recalibration below has
        // finished.
        this.restoreCalibration().then(() => this.requestForecast())
    }

    stop(): void {
        _forecastData = {}
        _calibrationFactors = undefined
    }

    private async requestForecast(force: boolean = false) {
        if (
            this._enabled === false ||
            this._latitude === undefined ||
            this._longitude === undefined ||
            this._declination === undefined ||
            this._azimuth === undefined ||
            this._maxKWP === undefined
        )
            return

        const existingForecastData = await getDataFromStorage(DATA_STORAGE_KEY)

        const storedForecast: ForecastData =
            existingForecastData?.value != null
                ? parseStoredForecast(existingForecastData.value)
                : {}

        if (
            !force &&
            existingForecastData !== null &&
            existingForecastData.value &&
            differenceInCalendarDays(
                new Date(),
                existingForecastData.updated_at
            ) < 1
        ) {
            _forecastData = storedForecast

            this._logger.log(
                'Found up to date solar forecast information in data storage.'
            )

            await this.updateCalibration()
            return
        }

        const data = await got.get(
            `https://api.forecast.solar/estimate/${this._latitude.toString()}/${this._longitude.toString()}/${this._declination.toString()}/${this._azimuth.toString()}/${this._maxKWP.toString()}?full=1`,
            {
                headers: {
                    accept: 'application/json',
                },
            }
        )

        if (data.statusCode === 200 && data?.body) {
            const latestForecast = transformRawForecast(JSON.parse(data.body))

            // Merge the latest forecast into the stored history. Each day in
            // the latest forecast replaces the previously stored forecast for
            // that day, so a day always keeps the most recent forecast made
            // for it, while past days remain historized.
            _forecastData = {
                ...storedForecast,
                ...latestForecast,
            }

            this._logger.log(
                'Successfully requested and updated solar forecast data'
            )

            await writeDataToStorage(
                DATA_STORAGE_KEY,
                JSON.stringify(_forecastData)
            )

            // Every new forecast is followed by a fresh calibration, so the
            // correction always reflects the most recent days.
            await this.updateCalibration()
        } else {
            this._logger.error(
                'Error while requesting solar forecast data: no data received. Please check your entered settings.'
            )
        }
    }

    private async restoreCalibration() {
        if (!_calibrationEnabled || _calibrationFactors !== undefined) return

        const storedCalibration = await getDataFromStorage(
            CALIBRATION_DATA_STORAGE_KEY
        )

        if (storedCalibration?.value == null) return

        try {
            _calibrationFactors = JSON.parse(storedCalibration.value)

            this._logger.log(
                'Restored solar forecast calibration from data storage.'
            )
        } catch {
            this._logger.warn(
                'Stored solar forecast calibration could not be read and is ignored.'
            )
        }
    }

    /**
     * Relearns the elevation dependent correction from the last
     * CALIBRATION_MAX_DAYS days of raw forecast history and the measured PV
     * production of the very same days.
     */
    private async updateCalibration() {
        if (
            !_calibrationEnabled ||
            this._latitude === undefined ||
            this._longitude === undefined
        )
            return

        // Today is left out because its production is still incomplete and
        // would pull every bin it touches downwards.
        const endDate = endOfDay(subDays(new Date(), 1))
        const startDate = startOfDay(subDays(endDate, CALIBRATION_MAX_DAYS - 1))

        const forecastHistory = await getRawSolarForecastHistory({
            startDate,
            endDate,
        })

        if (Object.keys(forecastHistory).length === 0) {
            this._logger.log(
                'Skipping solar forecast calibration: no forecast history available yet.'
            )
            return
        }

        const actualWattHoursByHour = await getActualPVWattHoursByHour(
            startDate,
            endDate
        )

        if (Object.keys(actualWattHoursByHour).length === 0) {
            this._logger.log(
                'Skipping solar forecast calibration: no measured PV values available yet.'
            )
            return
        }

        const factors = computeCalibrationFactors({
            forecastHistory,
            actualWattHoursByHour,
            latitude: this._latitude,
            longitude: this._longitude,
        })

        const factorValues = Object.values(factors.factors)

        if (factorValues.length === 0) {
            this._logger.log(
                'Solar forecast calibration produced no usable bins yet, keeping the forecast uncorrected.'
            )
            return
        }

        _calibrationFactors = factors

        await writeDataToStorage(
            CALIBRATION_DATA_STORAGE_KEY,
            JSON.stringify(factors)
        )

        this._logger.log(
            `Calibrated solar forecast from ${factors.days} day(s): ` +
                `${factorValues.length} elevation bin(s), factors between ` +
                `${Math.min(...factorValues).toFixed(2)} and ${Math.max(...factorValues).toFixed(2)}`
        )
    }
}

/**
 * Returns the measured PV production per hour in watt hours, keyed by the epoch
 * milliseconds of the start of the hour. The hourly view averages the polled
 * power values of an hour, so an average of x watts over an hour is x watt
 * hours of energy.
 */
async function getActualPVWattHoursByHour(
    startDate: Date,
    endDate: Date
): Promise<{ [hourStart: number]: number }> {
    const snapshots = (await findSnapshotsBetweenDates({
        startDate,
        endDate,
        grouping: 'hour',
    })) as HourlySnapshot[] | undefined

    const wattHoursByHour: { [hourStart: number]: number } = {}

    snapshots?.forEach((snapshot) => {
        const pvValues = (snapshot.device_snapshots ?? []).filter(
            (deviceSnapshot) =>
                deviceSnapshot.device_type === PVDevice.DEVICE_TYPE &&
                deviceSnapshot.name === 'power' &&
                Number.isFinite(deviceSnapshot.value)
        )

        // An hour without any PV reading is left out entirely. Recording it as
        // zero production would look like total shading to the calibration.
        if (pvValues.length === 0) return

        const hourStart = startOfHour(new Date(snapshot.created_at)).getTime()

        wattHoursByHour[hourStart] = Math.max(
            0,
            pvValues.reduce(
                (acc, deviceSnapshot) => acc + deviceSnapshot.value,
                0
            )
        )
    })

    return wattHoursByHour
}

/**
 * Applies the learned correction, if the calibration layer is enabled and has
 * usable factors. Returns the raw forecast otherwise.
 */
function calibrate(forecastData: ForecastData): ForecastData {
    if (!_calibrationEnabled || _calibrationFactors === undefined)
        return forecastData

    return applyCalibrationFactors(forecastData, _calibrationFactors)
}

/**
 * Transforms the raw response of the forecast.solar API into the per-day
 * forecast structure used throughout the application.
 */
function transformRawForecast(rawData: any): ForecastData {
    const forecastData: ForecastData = {}

    if (!rawData?.result?.watt_hours_period) return forecastData

    Object.entries(rawData.result.watt_hours_period).forEach(([key, value]) => {
        const datetime = parse(key, 'yyyy-MM-dd HH:mm:ss', new Date())
        const groupingKey = format(datetime, 'yyyy-MM-dd')

        if (!(groupingKey in forecastData)) forecastData[groupingKey] = {}

        forecastData[groupingKey][toISOStringWithTimezone(datetime)] = {
            wattHoursPeriod: parseFloat((value as any).toString()),
            wattHours: parseFloat(rawData.result.watt_hours[key].toString()),
        }
    })

    return forecastData
}

/**
 * Reads the stored forecast into the per-day structure. Installations that ran
 * an earlier version still hold the unmodified forecast.solar response under
 * the same storage key. That response is migrated on the fly here, otherwise
 * its top level keys ("result", "message") would be handed out as days.
 */
function parseStoredForecast(storedValue: string): ForecastData {
    let parsedValue: any

    try {
        parsedValue = JSON.parse(storedValue)
    } catch {
        return {}
    }

    if (parsedValue?.result?.watt_hours_period)
        return transformRawForecast(parsedValue)

    return sanitizeForecastData(parsedValue)
}

/**
 * Keeps only what is actually a day of forecast entries. Everything else is
 * dropped instead of being passed on as NaN by the consumers.
 */
function sanitizeForecastData(parsedValue: any): ForecastData {
    if (parsedValue === null || typeof parsedValue !== 'object') return {}

    const forecastData: ForecastData = {}

    Object.entries(parsedValue).forEach(([day, dayForecast]) => {
        if (
            !DAY_KEY_PATTERN.test(day) ||
            dayForecast === null ||
            typeof dayForecast !== 'object'
        )
            return

        const sanitizedDay: ForecastDay = {}

        Object.entries(dayForecast).forEach(
            ([timestamp, entry]: [string, any]) => {
                if (
                    !Number.isFinite(entry?.wattHoursPeriod) ||
                    !Number.isFinite(entry?.wattHours)
                )
                    return

                sanitizedDay[timestamp] = {
                    wattHoursPeriod: entry.wattHoursPeriod,
                    wattHours: entry.wattHours,
                }
            }
        )

        if (Object.keys(sanitizedDay).length > 0)
            forecastData[day] = sanitizedDay
    })

    return forecastData
}

/**
 * Returns the current solar forecast, i.e. the forecast for today and the
 * upcoming days of the live forecast window. Historized past days are
 * excluded here and can be retrieved via getSolarForecastHistory().
 */
export function getSolarForecastData(): ForecastData {
    const today = startOfDay(new Date())

    const currentForecast: ForecastData = {}

    Object.entries(_forecastData).forEach(([day, dayForecast]) => {
        const dayDate = parse(day, 'yyyy-MM-dd', new Date())

        if (!isBefore(dayDate, today)) currentForecast[day] = dayForecast
    })

    return calibrate(currentForecast)
}

/**
 * Returns the historized solar forecast for the given period from the data
 * storage. Requesting the current date returns the current forecast. When no
 * period is given, the full stored forecast history is returned.
 */
export async function getSolarForecastHistory(params: {
    startDate?: Date
    endDate?: Date
}): Promise<ForecastData> {
    return calibrate(await getRawSolarForecastHistory(params))
}

/**
 * Same as getSolarForecastHistory(), but without the calibration applied. This
 * is what the calibration itself learns from - correcting its own input would
 * make the correction compound over the days.
 */
async function getRawSolarForecastHistory(params: {
    startDate?: Date
    endDate?: Date
}): Promise<ForecastData> {
    const storedForecastData = await getDataFromStorage(DATA_STORAGE_KEY)

    if (!storedForecastData || storedForecastData.value == null) return {}

    const history: ForecastData = parseStoredForecast(storedForecastData.value)

    if (!params.startDate && !params.endDate) return history

    const start = params.startDate ? startOfDay(params.startDate) : undefined
    const end = params.endDate ? endOfDay(params.endDate) : undefined

    const result: ForecastData = {}

    Object.entries(history).forEach(([day, dayForecast]) => {
        const dayDate = parse(day, 'yyyy-MM-dd', new Date())

        if (start && isBefore(dayDate, start)) return
        if (end && isAfter(dayDate, end)) return

        result[day] = dayForecast
    })

    return result
}
