import path from 'node:path'

import adze, { setup } from 'adze'
import TransportFile from '@adze/transport-file'

import { registerDatabaseInitObserver } from './database'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'
import AdzeGlobal from 'adze/dist/adze-global'
import { getSetting, registerSettings } from './settings'

const _levels: { [key: string]: number } = {
    error: 1,
    warn: 2,
    info: 3,
    fail: 4,
    debug: 7,
    verbose: 8,
}

export type ChildLogger = adze<string, unknown>

const _settingKeyLogLevel = 'logging_loglevel'

const _fileTransport = new TransportFile({
    filename: path.join(process.env.DATA_DIR!, 'energypilot-io'),
    size: '10M',
    extension: '.log',
    end_stream: true,
    audit_file: path.join(process.env.DATA_DIR!, 'energypilot-io.audit.json'),
})

await _fileTransport.load()

var _globalStore: AdzeGlobal

export async function initLogging() {
    registerSettings({
        [_settingKeyLogLevel]: {
            type: 'enum',
            defaultValue: 'info',
            enumValues: Object.keys(_levels),
        },
    })

    registerDatabaseInitObserver(onDatabaseReady)
    registerSettingObserver(_settingKeyLogLevel, onChangeLogLevel)

    _globalStore = setup({
        format: 'pretty',
        middleware: [_fileTransport],
    })
}

async function onDatabaseReady() {
    const logLevel = await getSetting(_settingKeyLogLevel)
    onChangeLogLevel(logLevel)
}

function onChangeLogLevel(value: string) {
    _globalStore.configuration.activeLevel = _levels[value]
}

export function getLogger(module: string): adze<string, unknown> {
    return adze.timestamp.namespace(module).seal()
}
