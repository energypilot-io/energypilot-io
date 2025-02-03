import { clsx, type ClassValue } from 'clsx'
import { useEffect, useRef } from 'react'
import { InterfaceSchemaDef } from 'server/interfaces/IInterface'
import { twMerge } from 'tailwind-merge'
import * as zod from 'zod'

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
    else if (Math.abs(energy) < 1000000000)
        return { value: (energy / 1000000).toFixed(2), unit: 'MW' }
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
    schemaDefinition: InterfaceSchemaDef
) {
    if (schemaDefinition === undefined) return undefined

    var schema: any = {}

    Object.keys(schemaDefinition).forEach((fieldName: string) => {
        const fieldDefinition = schemaDefinition[fieldName]

        switch (fieldDefinition.type) {
            case 'ip':
                schema[fieldName as keyof typeof schema] = zod
                    .string()
                    .ip({ version: 'v4' })
                break

            case 'email':
                schema[fieldName as keyof typeof schema] = zod.string().email()
                break

            case 'password':
            case 'string':
                schema[fieldName as keyof typeof schema] = zod.string().min(1)
                break

            case 'number':
                schema[fieldName as keyof typeof schema] = zod.number()
                break

            default:
                break
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
