import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { isApiAuthorized, isApiPasswordRequired } from './api-auth.js'

const previousEnvironment = {
    apiPassword: process.env.API_PASSWORD,
    apiToken: process.env.API_TOKEN,
}

afterEach(() => {
    if (previousEnvironment.apiPassword === undefined)
        delete process.env.API_PASSWORD
    else process.env.API_PASSWORD = previousEnvironment.apiPassword

    if (previousEnvironment.apiToken === undefined) delete process.env.API_TOKEN
    else process.env.API_TOKEN = previousEnvironment.apiToken
})

test('uses the default password when no password is configured', () => {
    delete process.env.API_PASSWORD
    delete process.env.API_TOKEN

    assert.equal(isApiAuthorized('energypilot'), true)
    assert.equal(isApiAuthorized(undefined), false)
    assert.equal(isApiPasswordRequired(), true)
})

test('accepts a custom password and treats an explicitly empty value as disabled', () => {
    process.env.API_PASSWORD = 'a custom password'
    assert.equal(isApiAuthorized('a custom password'), true)
    assert.equal(isApiAuthorized('energypilot'), false)

    process.env.API_PASSWORD = ''
    assert.equal(isApiAuthorized(undefined), true)
    assert.equal(isApiAuthorized('anything'), true)
    assert.equal(isApiPasswordRequired(), false)
})

test('compares configured passwords and rejects malformed values', () => {
    process.env.API_PASSWORD = 'test-password'
    assert.equal(
        isApiAuthorized('test-password'),
        true
    )
    assert.equal(isApiAuthorized('wrong-token'), false)
    assert.equal(isApiAuthorized(undefined), false)
    assert.equal(isApiAuthorized(42), false)
})

test('supports the previous API_TOKEN setting during migration', () => {
    delete process.env.API_PASSWORD
    process.env.API_TOKEN = 'previous-password'
    assert.equal(isApiAuthorized('previous-password'), true)
})
