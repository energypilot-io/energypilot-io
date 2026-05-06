import {
    getDataFromStorage,
    writeDataToStorage,
} from '@/core/data-storage.manager'
import { ChildLogger, getLogger } from '@/core/log.manager'
import {
    MAX_FORECAST_AZIMUTH,
    MAX_FORECAST_DECLINATION,
    MAX_FORECAST_LATITUDE,
    MAX_FORECAST_LONGITUDE,
    MIN_FORECAST_AZIMUTH,
    MIN_FORECAST_DECLINATION,
    MIN_FORECAST_LATITUDE,
    MIN_FORECAST_LONGITUDE,
    MIN_FORECAST_MAXKWP,
    registerSettingChangeObserver,
    SETTING_FORECAST_AZIMUTH,
    SETTING_FORECAST_DECLINATION,
    SETTING_FORECAST_LATITUDE,
    SETTING_FORECAST_LONGITUDE,
    SETTING_FORECAST_MAXKWP,
    SettingChangeObserver,
} from '@/core/setting.manager'
import got from 'got'

import { differenceInCalendarDays, format, parse } from 'date-fns'
import schedule from 'node-schedule'

const DATA_STORAGE_KEY = 'forecast.data'

let _logger: ChildLogger

let _latitude: number
let _longitude: number
let _declination: number
let _azimuth: number
let _maxKWP: number

let _forecastRawData: any | undefined = undefined

class SolarForecastSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [
            SETTING_FORECAST_LATITUDE,
            SETTING_FORECAST_LONGITUDE,
            SETTING_FORECAST_DECLINATION,
            SETTING_FORECAST_AZIMUTH,
            SETTING_FORECAST_MAXKWP,
        ]
    }

    onSettingChange(name: string, value?: any): void {
        if (!this.getObservedSettings().includes(name) || !value) return

        const parsedValue = Number.parseFloat(value.toString())

        switch (name) {
            case SETTING_FORECAST_LATITUDE: {
                _latitude = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_LATITUDE),
                    MAX_FORECAST_LATITUDE
                )
                break
            }

            case SETTING_FORECAST_LONGITUDE: {
                _longitude = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_LONGITUDE),
                    MAX_FORECAST_LONGITUDE
                )
                break
            }

            case SETTING_FORECAST_DECLINATION: {
                _declination = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_DECLINATION),
                    MAX_FORECAST_DECLINATION
                )
                break
            }

            case SETTING_FORECAST_AZIMUTH: {
                _azimuth = Math.min(
                    Math.max(parsedValue, MIN_FORECAST_AZIMUTH),
                    MAX_FORECAST_AZIMUTH
                )
                break
            }

            case SETTING_FORECAST_MAXKWP: {
                _maxKWP = Math.max(parsedValue, MIN_FORECAST_MAXKWP)
                break
            }
        }

        requestForecast()
    }
}

export async function initSolarForecast() {
    _logger = getLogger('solar-forecast')

    await registerSettingChangeObserver(
        new SolarForecastSettingChangeObserver()
    )

    const recurrenceRule = new schedule.RecurrenceRule()
    recurrenceRule.hour = 0
    recurrenceRule.minute = 10

    schedule.scheduleJob(recurrenceRule, requestForecast)
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

            forecastData[groupingKey][datetime.toISOString()] = {
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

async function requestForecast() {
    if (
        _latitude === undefined ||
        _longitude === undefined ||
        _declination === undefined ||
        _azimuth === undefined ||
        _maxKWP === undefined
    )
        return

    const existingForecastData = await getDataFromStorage(DATA_STORAGE_KEY)
    if (
        existingForecastData !== null &&
        existingForecastData.value &&
        differenceInCalendarDays(new Date(), existingForecastData.updated_at) <
            1
    ) {
        _forecastRawData = JSON.parse(existingForecastData!.value)

        _logger.log(
            'Found up to date solar forecast information in data storage.'
        )
        return
    }

    const data = await got.get(
        `https://api.forecast.solar/estimate/${_latitude.toString()}/${_longitude.toString()}/${_declination.toString()}/${_azimuth.toString()}/${_maxKWP.toString()}?full=1`,
        {
            headers: {
                accept: 'application/json',
            },
        }
    )

    if (data.statusCode === 200 && data?.body) {
        _forecastRawData = JSON.parse(data.body)

        _logger.log('Successfully requested and updated solar forecast data')

        writeDataToStorage(DATA_STORAGE_KEY, data.body)
    } else {
        _logger.error(
            'Error while requesting solar forecast data: no data received. Please check your entered settings.'
        )
    }
}
