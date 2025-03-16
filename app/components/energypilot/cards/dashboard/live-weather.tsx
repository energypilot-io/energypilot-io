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

export type LiveWeatherCardProps = MoveableCardDndProps & {}

export function LiveWeatherCard({
    type = 'liveWeatherCard',
    index,
    endDrag,
    moveCard,
}: LiveWeatherCardProps) {
    const { t } = useTranslation()
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

    function getIconForCondition(condition: string) {
        switch (condition.trim()) {
            case 'Sunny':
                return <SunIcon size="3rem" />
            case 'Partly cloudy':
            case 'Partly Cloudy':
                return <CloudSunIcon size="3rem" />
            case 'Cloudy':
                return <CloudyIcon size="3rem" />
            case 'Overcast':
                return <CloudIcon size="3rem" />
            case 'Mist':
            case 'Fog':
            case 'Freezing fog':
                return <CloudFogIcon size="3rem" />
            case 'Patchy rain possible':
            case 'Patchy rain nearby':
            case 'Patchy light rain':
            case 'Light rain':
            case 'Moderate rain at times':
            case 'Moderate rain':
            case 'Light freezing rain':
            case 'Light rain shower':
            case 'Moderate or heavy rain shower':
                return <CloudRainIcon size="3rem" />
            case 'Patchy snow possible':
            case 'Patchy sleet possible':
            case 'Blowing snow':
            case 'Blizzard':
            case 'Light sleet':
            case 'Moderate or heavy sleet':
            case 'Patchy light snow':
            case 'Light snow':
            case 'Patchy moderate snow':
            case 'Moderate snow':
            case 'Patchy heavy snow':
            case 'Heavy snow':
            case 'Light sleet showers':
            case 'Moderate or heavy sleet showers':
            case 'Light snow showers':
            case 'Moderate or heavy snow showers':
                return <CloudSnowIcon size="3rem" />
            case 'Patchy freezing drizzle possible':
            case 'Patchy light drizzle':
            case 'Light drizzle':
            case 'Freezing drizzle':
            case 'Heavy freezing drizzle':
                return <CloudDrizzleIcon size="3rem" />
            case 'Thundery outbreaks possible':
            case 'Heavy rain at times':
            case 'Heavy rain':
            case 'Moderate or heavy freezing rain':
            case 'Torrential rain shower':
            case 'Patchy light rain with thunder':
            case 'Moderate or heavy rain with thunder':
            case 'Patchy light snow with thunder':
            case 'Moderate or heavy snow with thunder':
                return <CloudRainWindIcon size="3rem" />
            case 'Ice pellets':
            case 'Light showers of ice pellets':
            case 'Moderate or heavy showers of ice pellets':
                return <CloudHailIcon size="3rem" />
        }
        console.log(condition)
        return <CloudDrizzleIcon size="3rem" />
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
                                        weatherData.current.condition
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{weatherData.current.condition}</p>
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
                                                forecastWeatherData.condition
                                            )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>
                                                {forecastWeatherData.condition}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                    {forecastWeatherData.temperature} °C
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </MoveableCard>
    )
}
