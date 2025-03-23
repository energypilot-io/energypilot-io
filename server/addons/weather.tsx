import {
    WS_EVENT_REQUEST_WEATHER_LIVEDATA_UPDATE,
    WS_EVENT_WEATHER_LIVEDATA_UPDATED,
} from 'server/constants'
import {
    getSetting,
    getSettingAsNumber,
    registerSettings,
} from 'server/core/settings'
import {
    emitWebsocketEvent,
    registerWSEventListener,
} from 'server/core/webserver'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'

export type ForecastWeatherData = {
    localtime: number
    temperature: number
    conditions: string[]
}

export type WeatherData = {
    is_metric: boolean

    location: {
        name: string
        country: string
        lat: number
        lon: number
        localtime: number
    }

    current: {
        temperature: number
        conditions: string[]
    }

    forecasts: ForecastWeatherData[]
}

const _settingQuery = 'weather_query'
const _settingKeyApiKey = 'weather_api_key'
const _settingUnits = 'weather_units'
const _settingKeyForecastDays = 'weather_forecast_days'

let _lastWeatherData: WeatherData | undefined = undefined

export async function initWeatherAddon() {
    registerSettings({
        [_settingQuery]: {
            type: 'string',
        },

        [_settingKeyApiKey]: {
            type: 'string',
        },

        [_settingUnits]: {
            type: 'enum',
            defaultValue: 'metric',
            enumValues: ['metric', 'us'],
        },

        [_settingKeyForecastDays]: {
            type: 'number',
            defaultValue: '3',
            min: 1,
            max: 7,
        },
    })

    const pollWeatherInterval = setInterval(pollData, 60 * 1000)
    process.on('exit', (code) => {
        clearInterval(pollWeatherInterval)
    })

    registerSettingObserver(_settingQuery, pollData)
    registerSettingObserver(_settingKeyApiKey, pollData)
    registerSettingObserver(_settingUnits, pollData)
    registerSettingObserver(_settingKeyForecastDays, pollData)

    registerWSEventListener(WS_EVENT_REQUEST_WEATHER_LIVEDATA_UPDATE, () => {
        if (_lastWeatherData !== undefined) {
            emitWebsocketEvent(
                WS_EVENT_WEATHER_LIVEDATA_UPDATED,
                _lastWeatherData
            )
        }
    })

    pollData()
}

async function pollData() {
    const query = await getSetting(_settingQuery)
    const apiKey = await getSetting(_settingKeyApiKey)
    const units = await getSetting(_settingUnits)
    const forecastDays = await getSettingAsNumber(_settingKeyForecastDays)

    if (query === null || apiKey === null || forecastDays === null) return

    const response = await fetch(
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${query}?unitGroup=${units}&include=days&key=${apiKey}&contentType=json&lang=id`
    )

    if (response.status !== 200) return

    const responseBody = await response.json()

    if (responseBody === undefined) return

    _lastWeatherData = {
        is_metric: units === 'metric',

        location: {
            name: responseBody.address,
            country: responseBody.resolvedAddress,
            lat: responseBody.latitude,
            lon: responseBody.longitude,
            localtime: responseBody.days[0].datetimeEpoch * 1000,
        },

        current: {
            temperature: responseBody.days[0].temp,
            conditions: responseBody.days[0].conditions
                .split(',')
                .map((condition: string) => condition.trim()),
        },

        forecasts: responseBody.days
            .slice(1, forecastDays + 1)
            .map((forecastData: any) => {
                return {
                    localtime: forecastData.datetimeEpoch * 1000,
                    temperature: forecastData.temp,
                    conditions: forecastData.conditions
                        .split(',')
                        .map((condition: string) => condition.trim()),
                } as ForecastWeatherData
            }),
    }

    emitWebsocketEvent(WS_EVENT_WEATHER_LIVEDATA_UPDATED, _lastWeatherData)
}
