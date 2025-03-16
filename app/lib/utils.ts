import { clsx, type ClassValue } from 'clsx'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IFormParameterDefList } from 'server/defs/form-parameters'
import { twMerge } from 'tailwind-merge'
import * as zod from 'zod'

import { EnergyExportCard } from '~/components/energypilot/cards/dashboard/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/dashboard/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/dashboard/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/dashboard/live-energy'
import { LiveWeatherCard } from '~/components/energypilot/cards/dashboard/live-weather'

import { format as format_date_fns } from 'date-fns'
import { enGB, de } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatEnergy(energy: number) {
    if (Math.abs(energy) < 1000)
        return { value: energy.toFixed(2), unit: 'kWh' }
    else if (Math.abs(energy) < 1000000)
        return { value: (energy / 1000).toFixed(2), unit: 'MWh' }
    else return { value: (energy / 1000000).toFixed(2), unit: 'GWh' }
}

export function formatPower(energy: number) {
    if (Math.abs(energy) < 1000) return { value: energy.toFixed(0), unit: 'W' }
    else if (Math.abs(energy) < 1000000)
        return { value: (energy / 1000).toFixed(2), unit: 'kW' }
    else return { value: (energy / 1000000).toFixed(2), unit: 'MW' }
}

export function toEnergyString(energy: number) {
    const formatedEnergy = formatEnergy(energy)
    return `${formatedEnergy.value} ${formatedEnergy.unit}`
}

export function toPowerString(power: number) {
    const formatedPower = formatPower(power)
    return `${formatedPower.value} ${formatedPower.unit}`
}

export function useInterval(callback: any, delay: number) {
    const savedCallback = useRef()

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    // Set up the interval.
    useEffect(() => {
        function tick() {
            // @ts-ignore
            savedCallback!.current!()
        }
        if (delay !== null) {
            let id = setInterval(tick, delay)
            return () => clearInterval(id)
        }
    }, [delay])
}

export function zodSchemaDefinitionParser(
    formParameterDefList: IFormParameterDefList
) {
    if (formParameterDefList === undefined) return undefined

    var schema: any = {}

    Object.keys(formParameterDefList).forEach((fieldName: string) => {
        const fieldDefinition = formParameterDefList[fieldName]

        let zodFieldDefinition
        switch (fieldDefinition.type) {
            case 'ip':
                zodFieldDefinition = zod.string().ip({ version: 'v4' })
                break

            case 'email':
                zodFieldDefinition = zod.string().email()
                break

            case 'password':
            case 'string':
                zodFieldDefinition = zod.string()
                break

            case 'number':
                zodFieldDefinition = zod.number()
                break

            case 'enum':
                if (Array.isArray(fieldDefinition.enumValues)) {
                    zodFieldDefinition = zod.enum(
                        fieldDefinition!.enumValues as any
                    )
                    break
                }

            default:
                break
        }

        if (zodFieldDefinition !== undefined && zodFieldDefinition !== null) {
            if (fieldDefinition.min !== undefined) {
                if (zodFieldDefinition instanceof zod.ZodString) {
                    // @ts-ignore
                    zodFieldDefinition = zodFieldDefinition.min(
                        fieldDefinition.min
                    )
                } else if (zodFieldDefinition instanceof zod.ZodNumber) {
                    zodFieldDefinition = zodFieldDefinition.min(
                        fieldDefinition.min
                    )
                }
            }

            if (fieldDefinition.max !== undefined) {
                if (zodFieldDefinition instanceof zod.ZodString) {
                    // @ts-ignore
                    zodFieldDefinition = zodFieldDefinition.max(
                        fieldDefinition.max
                    )
                } else if (zodFieldDefinition instanceof zod.ZodNumber) {
                    zodFieldDefinition = zodFieldDefinition.max(
                        fieldDefinition.max
                    )
                }
            }

            schema[fieldName as keyof typeof schema] = zodFieldDefinition
        }
    })

    return zod.object(schema)
}

export function filterObject<T extends object>(
    obj: T,
    predicate: <K extends keyof T>(value: T[K], key: K) => boolean
) {
    const result: { [K in keyof T]?: T[K] } = {}
    ;(Object.keys(obj) as Array<keyof T>).forEach((name) => {
        if (predicate(obj[name], name)) {
            result[name] = obj[name]
        }
    })
    return result
}

export function useI18nFormat() {
    const { i18n } = useTranslation()

    function format(date: string | number | Date, formatStr: string) {
        let locale = enGB
        switch (i18n.language) {
            case 'de':
                locale = de
                break

            default:
                break
        }

        return format_date_fns(date, formatStr, {
            locale: locale,
        })
    }

    return { format }
}

export const DASHBOARD_CARDS: {
    [key: string]: { class: any; defaultVisibility: boolean }
} = {
    energyProductionCard: {
        class: EnergyProductionCard,
        defaultVisibility: true,
    },

    energyImportCard: {
        class: EnergyImportCard,
        defaultVisibility: true,
    },
    energyExportCard: {
        class: EnergyExportCard,
        defaultVisibility: true,
    },
    liveEnergyCard: {
        class: LiveEnergyCard,
        defaultVisibility: true,
    },
    liveWeatherCard: {
        class: LiveWeatherCard,
        defaultVisibility: false,
    },
}
