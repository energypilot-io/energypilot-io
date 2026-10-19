import { timingSafeEqual } from 'node:crypto'

export const DEFAULT_API_PASSWORD = 'energypilot'

export function getApiPassword(): string {
    return (
        process.env.API_PASSWORD ??
        process.env.API_TOKEN ??
        DEFAULT_API_PASSWORD
    )
}

export function isApiPasswordRequired(): boolean {
    return getApiPassword() !== ''
}

export function isApiAuthorized(password: unknown): boolean {
    const configuredPassword = getApiPassword()
    if (configuredPassword === '') return true
    if (typeof password !== 'string') return false

    const provided = Buffer.from(password)
    const expected = Buffer.from(configuredPassword)

    return (
        provided.length === expected.length &&
        timingSafeEqual(provided, expected)
    )
}
