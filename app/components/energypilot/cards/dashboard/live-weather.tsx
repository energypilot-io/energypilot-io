import { useEffect, useState } from 'react'

import {
    CloudDrizzleIcon,
    CloudFogIcon,
    CloudHailIcon,
    CloudIcon,
    CloudRainIcon,
    CloudRainWindIcon,
    CloudSnowIcon,
    CloudSunIcon,
    CloudyIcon,
    LoaderIcon,
    SunIcon,
} from 'lucide-react'

import { useTranslation } from 'react-i18next'
import { useSocket } from '~/context'
import {
    WS_EVENT_REQUEST_WEATHER_LIVEDATA_UPDATE,
    WS_EVENT_WEATHER_LIVEDATA_UPDATED,
} from 'server/constants'
import { MoveableCard, MoveableCardDndProps } from './moveable-card'
import { ForecastWeatherData, WeatherData } from 'server/addons/weather'
import { useI18nFormat } from '~/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '~/components/ui/tooltip'

import weatherapiConditions from 'public/weatherapi_conditions.json'

export type LiveWeatherCardProps = MoveableCardDndProps & {}

export function LiveWeatherCard({
    type = 'liveWeatherCard',
    index,
    endDrag,
    moveCard,
}: LiveWeatherCardProps) {
    const { t, i18n } = useTranslation()
    const { format } = useI18nFormat()
    const socket = useSocket()

    const [weatherData, setWeatherData] = useState<WeatherData | undefined>(
        undefined
    )

    useEffect(() => {
        if (!socket) return

        socket.on(WS_EVENT_WEATHER_LIVEDATA_UPDATED, (data: WeatherData) => {
            setWeatherData(data)
        })

        socket.emit(WS_EVENT_REQUEST_WEATHER_LIVEDATA_UPDATE)
    }, [socket])

    function getTextForCondition(condition_code: number) {
        if (i18n === undefined) return null

        for (const condition of weatherapiConditions.filter(
            (condition) => condition.code === condition_code
        )) {
            for (const languageEntry of condition.languages) {
                if (languageEntry.lang_iso === i18n.language) {
                    return languageEntry.day_text
                }
            }

            return condition.day
        }

        return null
    }

    function getIconForCondition(condition_code: number) {
        switch (condition_code) {
            case 1000:
                return <SunIcon size="3rem" />
            case 1003:
                return <CloudSunIcon size="3rem" />
            case 1006:
                return <CloudyIcon size="3rem" />
            case 1009:
                return <CloudIcon size="3rem" />
            case 1030:
            case 1135:
            case 1147:
                return <CloudFogIcon size="3rem" />
            case 1063:
            case 1180:
            case 1183:
            case 1186:
            case 1189:
            case 1198:
            case 1240:
            case 1243:
                return <CloudRainIcon size="3rem" />
            case 1066:
            case 1069:
            case 1114:
            case 1117:
            case 1204:
            case 1207:
            case 1210:
            case 1213:
            case 1216:
            case 1219:
            case 1222:
            case 1225:
            case 1249:
            case 1252:
            case 1255:
            case 1258:
            case 1279:
            case 1282:
                return <CloudSnowIcon size="3rem" />
            case 1072:
            case 1150:
            case 1153:
            case 1168:
            case 1171:
                return <CloudDrizzleIcon size="3rem" />
            case 1087:
            case 1192:
            case 1195:
            case 1201:
            case 1246:
            case 1273:
            case 1276:
                return <CloudRainWindIcon size="3rem" />
            case 1237:
            case 1261:
            case 1264:
                return <CloudHailIcon size="3rem" />
        }
    }

    return (
        <MoveableCard
            type={type}
            index={index}
            moveCard={moveCard}
            endDrag={endDrag}
            title={t('cards.liveWeatherCard.title')}
        >
            {weatherData === undefined ? (
                <LoaderIcon className="animate-spin" size={64} />
            ) : (
                <div className="flex flex-col justify-start w-full gap-4">
                    <div className="flex justify-between flex-wrap">
                        <div className="flex flex-col justify-between">
                            <p className="text-4xl font-bold">
                                {weatherData.location.name}
                            </p>
                            <p className="text-sm text-gray-600">
                                {new Date(
                                    weatherData.location.localtime
                                ).toLocaleString()}{' '}
                                - {weatherData.location.country}
                            </p>
                        </div>
                        <div className="flex gap-2 text-5xl">
                            <Tooltip>
                                <TooltipTrigger>
                                    {getIconForCondition(
                                        weatherData.current.condition_code
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {getTextForCondition(
                                            weatherData.current.condition_code
                                        )}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                            {weatherData.current.temperature} °C
                        </div>
                    </div>

                    <div className="flex gap-6 flex-wrap">
                        {weatherData.forecasts.map(
                            (
                                forecastWeatherData: ForecastWeatherData,
                                index
                            ) => (
                                <div
                                    className="flex flex-col items-center"
                                    key={index}
                                >
                                    <p className="font-bold">
                                        {format(
                                            forecastWeatherData.localtime,
                                            'E'
                                        )}
                                    </p>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            {getIconForCondition(
                                                forecastWeatherData.condition_code
                                            )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>
                                                {getTextForCondition(
                                                    forecastWeatherData.condition_code
                                                )}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                    {forecastWeatherData.temperature} °C
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex justify-end">
                        <p className="text-xs text-gray-500">
                            Powered by{' '}
                            <a
                                href="https://www.weatherapi.com/"
                                title="Weather API"
                                className="underline"
                                target="_blank"
                            >
                                WeatherAPI.com
                            </a>
                        </p>
                    </div>
                </div>
            )}
        </MoveableCard>
    )
}
