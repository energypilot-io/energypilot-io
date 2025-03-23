import { useEffect, useState } from 'react'

import {
    CloudDrizzleIcon,
    CloudFogIcon,
    CloudHailIcon,
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

import weather_conditions from 'public/weather_conditions.json'

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

    function getTextForCondition(conditions: string[]) {
        if (i18n === undefined) return null

        const conditionText = conditions.map((condition) => {
            return (weather_conditions as { [lang: string]: any })[
                i18n.language
            ][condition]
        })

        return conditionText.join(', ')
    }

    function getIconForCondition(conditions: string[]) {
        for (const condition of conditions) {
            switch (condition) {
                case 'type_1':
                    return <CloudSnowIcon size="3rem" />

                case 'type_2':
                case 'type_3':
                case 'type_4':
                case 'type_5':
                case 'type_6':
                    return <CloudDrizzleIcon size="3rem" />

                case 'type_7':
                case 'type_8':
                case 'type_19':
                    return <CloudFogIcon size="3rem" />

                case 'type_9':
                case 'type_10':
                case 'type_11':
                case 'type_12':
                case 'type_13':
                case 'type_14':
                case 'type_17':
                case 'type_31':
                case 'type_32':
                case 'type_33':
                case 'type_34':
                case 'type_35':
                    return <CloudSnowIcon size="3rem" />

                case 'type_16':
                case 'type_39':
                case 'type_40':
                    return <CloudHailIcon size="3rem" />

                case 'type_15':
                case 'type_18':
                case 'type_36':
                case 'type_37':
                case 'type_38':
                    return <CloudRainWindIcon size="3rem" />

                case 'type_20':
                case 'type_21':
                case 'type_22':
                case 'type_23':
                case 'type_24':
                case 'type_25':
                case 'type_26':
                    return <CloudRainIcon size="3rem" />

                case 'type_27':
                case 'type_28':
                    return <CloudSunIcon size="3rem" />

                case 'type_41':
                case 'type_42':
                    return <CloudyIcon size="3rem" />

                case 'type_43':
                    return <SunIcon size="3rem" />
            }
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
                                {weatherData.location.country}
                            </p>
                        </div>
                        <div className="flex gap-2 text-5xl">
                            <Tooltip>
                                <TooltipTrigger>
                                    {getIconForCondition(
                                        weatherData.current.conditions
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {getTextForCondition(
                                            weatherData.current.conditions
                                        )}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                            {weatherData.current.temperature}{' '}
                            {weatherData.is_metric ? '°C' : '°F'}
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
                                                forecastWeatherData.conditions
                                            )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>
                                                {getTextForCondition(
                                                    forecastWeatherData.conditions
                                                )}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                    {forecastWeatherData.temperature}{' '}
                                    {weatherData.is_metric ? '°C' : '°F'}
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex justify-end">
                        <p className="text-xs text-gray-500">
                            Powered by{' '}
                            <a
                                href="https://www.visualcrossing.com/"
                                title="visualcrossing.com"
                                className="underline font-bold"
                                target="_blank"
                            >
                                visualcrossing.com
                            </a>
                        </p>
                    </div>
                </div>
            )}
        </MoveableCard>
    )
}
