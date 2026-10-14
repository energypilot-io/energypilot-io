import { timingSafeEqual } from 'node:crypto'

export function isApiAuthorized(token: unknown): boolean {
    const configuredToken = process.env.API_TOKEN
    if (!configuredToken) {
        return process.env.NODE_ENV !== 'production' && !process.env.HOST
    }
    if (typeof token !== 'string') return false

    const provided = Buffer.from(token)
    const expected = Buffer.from(configuredToken)

    return (
        provided.length === expected.length &&
        timingSafeEqual(provided, expected)
    )
}
