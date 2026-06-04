import {
    getDataFromStorage,
    writeDataToStorage,
} from '@/core/data-storage.manager.js'
import got from 'got'

import { differenceInCalendarDays, format, parse } from 'date-fns'
import schedule from 'node-schedule'
import { SettingChangeObserver } from '@/observers/setting-change.observer.js'
import { ModuleBase } from './module.base.js'
import { toISOStringWithTimezone } from '@/libs/utils.js'

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

let _forecastRawData: any = {}

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
        ]
    }

    onSettingChange(name: string, value?: any): boolean {
        if (!this.getObservedSettings().includes(name) || value === undefined)
            return false

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
        this.requestForecast()
    }

    stop(): void {
        _forecastRawData = {}
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
        if (
            !force &&
            existingForecastData !== null &&
            existingForecastData.value &&
            differenceInCalendarDays(
                new Date(),
                existingForecastData.updated_at
            ) < 1
        ) {
            _forecastRawData = JSON.parse(existingForecastData!.value)

            this._logger.log(
                'Found up to date solar forecast information in data storage.'
            )
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
            _forecastRawData = JSON.parse(data.body)

            this._logger.log(
                'Successfully requested and updated solar forecast data'
            )

            writeDataToStorage(DATA_STORAGE_KEY, data.body)
        } else {
            this._logger.error(
                'Error while requesting solar forecast data: no data received. Please check your entered settings.'
            )
        }
    }
}

export function getSolarForecastData() {
    if (!_forecastRawData) return {}

    const forecastData: {
        [day: string]: {
            [datetime: string]: { wattHoursPeriod: number; wattHours: number }
        }
    } = {}

    Object.entries(_forecastRawData.result.watt_hours_period).forEach(
        ([key, value]) => {
            const datetime = parse(key, 'yyyy-MM-dd HH:mm:ss', new Date())
            const groupingKey = format(datetime, 'yyyy-MM-dd')

            if (!(groupingKey in forecastData)) forecastData[groupingKey] = {}

            forecastData[groupingKey][toISOStringWithTimezone(datetime)] = {
                wattHoursPeriod: parseFloat((value as any).toString()),
                wattHours: parseFloat(
                    _forecastRawData.result.watt_hours[key].toString()
                ),
            }
        }
    )

    return {
        ...forecastData,
    }
}
