import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { isApiAuthorized } from './api-auth.js'

const previousEnvironment = {
    apiToken: process.env.API_TOKEN,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
}

afterEach(() => {
    if (previousEnvironment.apiToken === undefined) delete process.env.API_TOKEN
    else process.env.API_TOKEN = previousEnvironment.apiToken

    if (previousEnvironment.host === undefined) delete process.env.HOST
    else process.env.HOST = previousEnvironment.host

    if (previousEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousEnvironment.nodeEnv
})

test('fails closed in production without a configured token', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.API_TOKEN
    delete process.env.HOST

    assert.equal(isApiAuthorized(undefined), false)
})

test('allows tokenless local development only on the default loopback bind', () => {
    delete process.env.NODE_ENV
    delete process.env.API_TOKEN
    delete process.env.HOST
    assert.equal(isApiAuthorized(undefined), true)

    process.env.HOST = '0.0.0.0'
    assert.equal(isApiAuthorized(undefined), false)
})

test('compares configured tokens and rejects missing or malformed values', () => {
    process.env.API_TOKEN = 'test-api-token-with-sufficient-entropy'
    assert.equal(
        isApiAuthorized('test-api-token-with-sufficient-entropy'),
        true
    )
    assert.equal(isApiAuthorized('wrong-token'), false)
    assert.equal(isApiAuthorized(undefined), false)
    assert.equal(isApiAuthorized(42), false)
})
