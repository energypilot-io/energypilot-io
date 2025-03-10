import { registerSettings } from 'server/core/settings'

const _settingKeyApiKey = 'weather_api_key'
const _settingKeyForecastDays = 'weather_forecast_days'

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
}
