import { WS_EVENT_WEATHER_LIVEDATA_UPDATED } from 'server/constants'
import {
    getSetting,
    getSettingAsNumber,
    registerSettings,
} from 'server/core/settings'
import {
    emitWebsocketEvent,
    registerClientConnectedObserver,
} from 'server/core/webserver'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'

export type ForecastWeatherData = {
    localtime: number
    temperature: number
    condition: string
}

export type WeatherData = {
    location: {
        name: string
        country: string
        lat: number
        lon: number
        localtime: number
    }

    current: {
        temperature: number
        condition: string
    }

    forecasts: ForecastWeatherData[]
}

const _settingKeyApiKey = 'weather_api_key'
const _settingKeyForecastDays = 'weather_forecast_days'

let _lastWeatherData: WeatherData | undefined = undefined

export async function initWeatherAddon() {
    registerSettings({
        [_settingKeyApiKey]: {
            type: 'string',
            min: 10,
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

    registerSettingObserver(_settingKeyApiKey, pollData)
    registerSettingObserver(_settingKeyForecastDays, pollData)
    registerClientConnectedObserver(onWSClientConnected)

    pollData()
}

async function pollData() {
    const apiKey = await getSetting(_settingKeyApiKey)
    const forecastDays = await getSettingAsNumber(_settingKeyForecastDays)

    if (apiKey === undefined || forecastDays === undefined) return

    const response = await fetch(
        `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=Kumhausen&days=${forecastDays}&aqi=no&alerts=no`
    )

    if (response.status !== 200) return

    const responseBody = await response.json()

    if (responseBody === undefined) return

    _lastWeatherData = {
        location: {
            name: responseBody.location.name,
            country: responseBody.location.country,
            lat: responseBody.location.lat,
            lon: responseBody.location.lon,
            localtime: responseBody.location.localtime_epoch * 1000,
        },

        current: {
            temperature: responseBody.current.temp_c,
            condition: responseBody.current.condition.text,
        },

        forecasts: responseBody.forecast.forecastday.map(
            (forecastData: any) => {
                return {
                    localtime: forecastData.date_epoch * 1000,
                    temperature: forecastData.day.avgtemp_c,
                    condition: forecastData.day.condition.text,
                } as ForecastWeatherData
            }
        ),
    }

    emitWebsocketEvent(WS_EVENT_WEATHER_LIVEDATA_UPDATED, _lastWeatherData)
}

function onWSClientConnected() {
    if (_lastWeatherData === undefined) return
    emitWebsocketEvent(WS_EVENT_WEATHER_LIVEDATA_UPDATED, _lastWeatherData)
}
