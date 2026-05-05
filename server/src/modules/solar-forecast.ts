import { ChildLogger, getLogger } from '@/core/log.manager'
import {
    registerSettingChangeObserver,
    SETTING_FORECAST_AZIMUTH,
    SETTING_FORECAST_DECLINATION,
    SETTING_FORECAST_LATITUDE,
    SETTING_FORECAST_LONGITUDE,
    SETTING_FORECAST_MAXKWP,
    SettingChangeObserver,
} from '@/core/setting.manager'
import got from 'got'

let _logger: ChildLogger

let _latitude: number
let _longitude: number
let _declination: number
let _azimuth: number
let _maxKWP: number

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
                _latitude = parsedValue
                break
            }

            case SETTING_FORECAST_LONGITUDE: {
                _longitude = parsedValue
                break
            }

            case SETTING_FORECAST_DECLINATION: {
                _declination = parsedValue
                break
            }

            case SETTING_FORECAST_AZIMUTH: {
                _azimuth = parsedValue
                break
            }

            case SETTING_FORECAST_MAXKWP: {
                _maxKWP = parsedValue
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

    const data = await got.get(
        `https://api.forecast.solar/estimate/${_latitude.toString()}/${_longitude.toString()}/${_declination.toString()}/${_azimuth.toString()}/${_maxKWP.toString()}`,
        {
            headers: {
                accept: 'application/json',
            },
        }
    )

    console.log(data)
}
