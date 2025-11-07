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
