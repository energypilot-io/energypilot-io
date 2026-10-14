import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test, { after } from 'node:test'

const testDataDirectory = mkdtempSync(path.join(tmpdir(), 'energypilot-tests-'))
process.env.DATA_DIR = testDataDirectory

const { validateSettingsInput } = await import('./setting-manager.js')

after(() => {
    rmSync(testDataDirectory, { recursive: true, force: true })
})

test('accepts valid polling settings', () => {
    assert.deepEqual(validateSettingsInput('general', 'polling_rate', 10), {})
    assert.deepEqual(
        validateSettingsInput('general', 'snapshot_persistance_interval', 300),
        {}
    )
})

test('rejects invalid numeric and unknown settings', () => {
    assert.notDeepEqual(
        validateSettingsInput('general', 'polling_rate', 'invalid'),
        {}
    )
    assert.notDeepEqual(
        validateSettingsInput('general', 'polling_rate', 201),
        {}
    )
    assert.notDeepEqual(
        validateSettingsInput('general', 'unknown_setting', true),
        {}
    )
})

test('keeps an existing secret when its form field is blank', () => {
    assert.deepEqual(
        validateSettingsInput('telegram_bot', 'telegram_bot_token', ''),
        {}
    )
})

test('validates Telegram IDs as a bounded comma-separated list', () => {
    assert.deepEqual(
        validateSettingsInput('telegram_bot', 'allowed_user_ids', '123, 456'),
        {}
    )
    assert.notDeepEqual(
        validateSettingsInput('telegram_bot', 'allowed_user_ids', '123, nope'),
        {}
    )
})
