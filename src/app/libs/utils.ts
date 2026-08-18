const DEVICE_COLORS: string[] = [
    'hsl(356, 74%, 37%)', //  0 deep red
    'hsl(152, 68%, 44%)', //  1 strong emerald
    'hsl(280, 62%, 62%)', //  2 vivid purple
    'hsl(92, 58%, 57%)', //  3 light lime
    'hsl(258, 74%, 44%)', //  4 deep violet
    'hsl(70, 68%, 39%)', //  5 strong olive
    'hsl(215, 62%, 60%)', //  6 vivid blue
    'hsl(38, 58%, 59%)', //  7 light amber
    'hsl(202, 74%, 41%)', //  8 deep sky
    'hsl(24, 68%, 42%)', //  9 strong orange
    'hsl(174, 62%, 55%)', // 10 vivid teal
    'hsl(320, 58%, 68%)', // 11 light magenta
    'hsl(152, 74%, 35%)', // 12 deep emerald
    'hsl(280, 68%, 53%)', // 13 strong purple
    'hsl(92, 62%, 48%)', // 14 vivid lime
    'hsl(232, 58%, 70%)', // 15 light indigo
    'hsl(70, 74%, 30%)', // 16 deep olive
    'hsl(215, 68%, 51%)', // 17 strong blue
    'hsl(38, 62%, 50%)', // 18 vivid amber
    'hsl(190, 58%, 66%)', // 19 light cyan
    'hsl(24, 74%, 33%)', // 20 deep orange
    'hsl(174, 68%, 46%)', // 21 strong teal
    'hsl(320, 62%, 59%)', // 22 vivid magenta
    'hsl(130, 58%, 59%)', // 23 light green
    'hsl(280, 74%, 44%)', // 24 deep purple
    'hsl(92, 68%, 39%)', // 25 strong lime
    'hsl(232, 62%, 61%)', // 26 vivid indigo
    'hsl(50, 58%, 58%)', // 27 light gold
    'hsl(215, 74%, 42%)', // 28 deep blue
    'hsl(38, 68%, 41%)', // 29 strong amber
    'hsl(190, 62%, 57%)', // 30 vivid cyan
    'hsl(356, 58%, 64%)', // 31 light red
    'hsl(174, 74%, 37%)', // 32 deep teal
    'hsl(320, 68%, 50%)', // 33 strong magenta
    'hsl(130, 62%, 50%)', // 34 vivid green
    'hsl(258, 58%, 70%)', // 35 light violet
    'hsl(92, 74%, 30%)', // 36 deep lime
    'hsl(232, 68%, 52%)', // 37 strong indigo
    'hsl(50, 62%, 49%)', // 38 vivid gold
    'hsl(202, 58%, 68%)', // 39 light sky
    'hsl(38, 74%, 32%)', // 40 deep amber
    'hsl(190, 68%, 48%)', // 41 strong cyan
    'hsl(356, 62%, 55%)', // 42 vivid red
    'hsl(152, 58%, 62%)', // 43 light emerald
    'hsl(320, 74%, 41%)', // 44 deep magenta
    'hsl(130, 68%, 41%)', // 45 strong green
    'hsl(258, 62%, 62%)', // 46 vivid violet
    'hsl(70, 58%, 57%)', // 47 light olive
    'hsl(232, 74%, 43%)', // 48 deep indigo
    'hsl(50, 68%, 40%)', // 49 strong gold
    'hsl(202, 62%, 59%)', // 50 vivid sky
    'hsl(24, 58%, 60%)', // 51 light orange
    'hsl(190, 74%, 39%)', // 52 deep cyan
    'hsl(356, 68%, 46%)', // 53 strong red
    'hsl(152, 62%, 53%)', // 54 vivid emerald
    'hsl(280, 58%, 70%)', // 55 light purple
    'hsl(130, 74%, 32%)', // 56 deep green
    'hsl(258, 68%, 53%)', // 57 strong violet
    'hsl(70, 62%, 48%)', // 58 vivid olive
    'hsl(215, 58%, 69%)', // 59 light blue
    'hsl(50, 74%, 31%)', // 60 deep gold
    'hsl(202, 68%, 50%)', // 61 strong sky
    'hsl(24, 62%, 51%)', // 62 vivid orange
    'hsl(174, 58%, 64%)', // 63 light teal
]

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

export function toEnergyString(energy: number) {
    const formatedEnergy = formatEnergy(energy)
    return `${formatedEnergy.value} ${formatedEnergy.unit}`
}

export function toPowerString(power: number) {
    const formatedPower = formatPower(power)
    return `${formatedPower.value} ${formatedPower.unit}`
}

export function colorForDeviceName(deviceName: string): string {
    // FNV-1a with an avalanche mix. The old hash*31 kept the low bits
    // correlated with name length, so similar names clustered; this spreads
    // them evenly across all 64 slots.
    let hash = 0x811c9dc5
    for (let i = 0; i < deviceName.length; i++) {
        hash ^= deviceName.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x21f0aaad)
    hash ^= hash >>> 15

    return DEVICE_COLORS[(hash >>> 0) % DEVICE_COLORS.length]
}
