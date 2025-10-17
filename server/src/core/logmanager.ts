import path from 'node:path'

import adze, { setup } from 'adze'
import TransportFile from '@adze/transport-file'
import AdzeGlobal from 'adze/dist/adze-global'

const _levels: { [key: string]: number } = {
    error: 1,
    warn: 2,
    info: 3,
    fail: 4,
    debug: 7,
    verbose: 8,
}

export type ChildLogger = adze<string, unknown>

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
    _globalStore = setup({
        format: 'pretty',
        middleware: [_fileTransport],
    })

    _globalStore.configuration.activeLevel =
        _levels[process.env.NODE_ENV === 'development' ? 'debug' : 'info']

    const logger = getLogger('logmanager')
    logger.info('Logging initialized')
}

export function getLogger(module: string): adze<string, unknown> {
    return adze.timestamp.namespace(module).seal()
}
