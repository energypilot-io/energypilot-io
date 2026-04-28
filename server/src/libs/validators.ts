const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateIsNotEmpty(
    key: string,
    value: string
): { [key: string]: string } {
    if (!value || value.trim() === '') {
        return { [key]: 'messages.validations.required' }
    }
    return {}
}

export function validateIsPositiveInteger(
    key: string,
    value: string
): { [key: string]: string } {
    if (!/^\d+$/.test(value) || parseInt(value) <= 0) {
        return { [key]: 'messages.validations.invalid_value' }
    }
    return {}
}

export function validateIntegerInRange(
    key: string,
    value: string,
    min: number,
    max: number
): { [key: string]: string } {
    if (!/^\d+$/.test(value)) {
        return { [key]: 'messages.validations.invalid_value' }
    }

    const parsedValue = parseInt(value)
    if (parsedValue < min || parsedValue > max) {
        return { [key]: 'messages.validations.invalid_value' }
    }

    return {}
}

export function validateAllowedValues(
    key: string,
    value: string,
    allowedValues: string[]
): { [key: string]: string } {
    if (!allowedValues.includes(value)) {
        return { [key]: 'messages.validations.invalid_value' }
    }
    return {}
}

export function validateIPAddress(
    key: string,
    ip: string
): { [key: string]: string } {
    if (!ipRegex.test(ip)) {
        return { [key]: 'messages.validations.invalid_ip_address' }
    }
    return {}
}

export function validateEmail(
    key: string,
    email: string
): { [key: string]: string } {
    if (!emailRegex.test(email)) {
        return { [key]: 'messages.validations.invalid_email' }
    }
    return {}
}
