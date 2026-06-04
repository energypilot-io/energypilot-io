export function formatEnergy(energy: number, useAbsolute = false) {
    if (Math.abs(energy) < 1000)
        return {
            value: (useAbsolute ? Math.abs(energy) : energy).toFixed(2),
            unit: 'kWh',
        }
    else if (Math.abs(energy) < 1000000)
        return {
            value: (useAbsolute
                ? Math.abs(energy / 1000)
                : energy / 1000
            ).toFixed(2),
            unit: 'MWh',
        }
    else
        return {
            value: (useAbsolute
                ? Math.abs(energy / 1000000)
                : energy / 1000000
            ).toFixed(2),
            unit: 'GWh',
        }
}

export function formatPower(energy: number, useAbsolute = false) {
    if (Math.abs(energy) < 1000)
        return {
            value: (useAbsolute ? Math.abs(energy) : energy).toFixed(0),
            unit: 'W',
        }
    else if (Math.abs(energy) < 1000000)
        return {
            value: (useAbsolute
                ? Math.abs(energy / 1000)
                : energy / 1000
            ).toFixed(2),
            unit: 'kW',
        }
    else
        return {
            value: (useAbsolute
                ? Math.abs(energy / 1000000)
                : energy / 1000000
            ).toFixed(2),
            unit: 'MW',
        }
}

export function escapeMarkdown(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/([_*`|!.[\](){}>#+=~-])/g, '\\$1')
}

export function toEnergyString(energy: number, forTelegram: boolean = false) {
    const formatedEnergy = formatEnergy(energy)
    const energyString = `${formatedEnergy.value} ${formatedEnergy.unit}`
    return forTelegram ? escapeMarkdown(energyString) : energyString
}

export function toPowerString(power: number, forTelegram: boolean = false) {
    const formatedPower = formatPower(power)
    const powerString = `${formatedPower.value} ${formatedPower.unit}`
    return forTelegram ? escapeMarkdown(powerString) : powerString
}

const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0')

export function toISOStringWithTimezone(date: Date): string {
    const tzOffset = -date.getTimezoneOffset()
    const diff = tzOffset >= 0 ? '+' : '-'
    const tzString = diff + pad(tzOffset / 60) + ':' + pad(tzOffset % 60)

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tzString}`
    )
}
