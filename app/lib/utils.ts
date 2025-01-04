import { clsx, type ClassValue } from 'clsx'
import { useEffect, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatEnergy(energy: number) {
    if (Math.abs(energy) <= 1000)
        return { value: energy.toFixed(2), unit: 'kWh' }
    else if (Math.abs(energy) <= 1000000)
        return { value: (energy / 1000).toFixed(2), unit: 'MWh' }
}

export function formatPower(energy: number) {
    if (Math.abs(energy) <= 1000) return { value: energy.toFixed(0), unit: 'W' }
    else if (Math.abs(energy) <= 1000000)
        return { value: (energy / 1000).toFixed(2), unit: 'kW' }
    else if (Math.abs(energy) <= 1000000000)
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
