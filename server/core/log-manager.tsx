import fs from 'fs'
import path from 'node:path'

import { ILogObjMeta, Logger } from 'tslog'
import { createStream, RotatingFileStream } from 'rotating-file-stream'

import { LoggingDef } from 'server/defs/configuration'
import { settings } from './settings'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'
import { Setting } from 'server/database/entities/setting.entity'
import { registerDatabaseObserver } from './database-manager'

const _mainLogger = new Logger({
    type: 'pretty',
    stylePrettyLogs: false,
    hideLogPositionForProduction: process.env.NODE_ENV === 'production',
    minLevel: 3,
})

const levels: { [key: string]: number } = {
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
}

var _loggingDef: LoggingDef | undefined

var _childLoggers: { [key: string]: logging.ChildLogger } = {}

export namespace logging {
    const _settingKeyLogLevel = 'logging_loglevel'

    export class ChildLogger {
        private _name: string
        private _mainLogger: Logger<unknown>

        constructor(name: string, mainLogger: Logger<unknown>) {
            this._name = name
            this._mainLogger = mainLogger
        }

        public trace(...args: unknown[]) {
            this._mainLogger.trace(`[${this._name}] ${args[0]}`)
        }

        public debug(...args: unknown[]) {
            this._mainLogger.debug(`[${this._name}] ${args[0]}`)
        }

        public info(...args: unknown[]) {
            this._mainLogger.info(`[${this._name}] ${args[0]}`)
        }

        public warn(...args: unknown[]) {
            this._mainLogger.warn(`[${this._name}] ${args[0]}`)
        }

        public error(...args: unknown[]) {
            this._mainLogger.error(`[${this._name}] ${args[0]}`)
        }

        public fatal(...args: unknown[]) {
            this._mainLogger.fatal(`[${this._name}] ${args[0]}`)
        }
    }

    export function initLogging(loggingDef: LoggingDef | undefined) {
        if (
            _loggingDef === undefined ||
            _loggingDef!.loggers === undefined ||
            _loggingDef!.loggers.indexOf('file') > -1
        ) {
            initFileLogging(getFilename(_loggingDef))
        }

        settings.registerSettings({
            [_settingKeyLogLevel]: {
                type: 'enum',
                defaultValue: 'info',
                enumValues: Object.keys(levels),
            },
        })

        registerDatabaseObserver(onDatabaseReady)
        registerSettingObserver(_settingKeyLogLevel, onChangeLogLevel)
    }

    async function onDatabaseReady() {
        _mainLogger.settings.minLevel =
            levels[await settings.getSetting(_settingKeyLogLevel)]
    }

    function onChangeLogLevel(setting: Setting) {
        _mainLogger.settings.minLevel = levels[setting.value]
    }

    function getFilename(loggingDef: LoggingDef | undefined) {
        try {
            fs.accessSync(process.env.DATA_DIR!, fs.constants.W_OK)
            return path.join(
                process.env.DATA_DIR!,
                loggingDef !== undefined &&
                    loggingDef.file !== undefined &&
                    loggingDef.file.filename !== undefined
                    ? loggingDef.file.filename
                    : 'energypilot-io.log'
            )
        } catch {
            _mainLogger.error(
                `Data directory [${process.env.DATA_DIR}] not writeable. File logging is disabled!`
            )

            return undefined
        }
    }

    function initFileLogging(file: string | undefined) {
        if (file === undefined) {
            return
        }

        var _rotatingFileStream: RotatingFileStream

        const rotatingFiles: boolean =
            _loggingDef !== undefined &&
            _loggingDef.file !== undefined &&
            _loggingDef.file.rotatingFiles !== undefined
                ? _loggingDef.file.rotatingFiles
                : true

        if (rotatingFiles) {
            _rotatingFileStream = createStream(file, {
                size: _loggingDef?.file?.size || '10M',
                interval: _loggingDef?.file?.interval || '1d',
                compress: _loggingDef?.file?.compress || 'gzip',
            })
        }

        _mainLogger.attachTransport((logObj: ILogObjMeta) => {
            const logMessage = `[${logObj['_meta']['date'].toISOString()}] [${
                logObj['_meta']['name']
            }]\t${logObj['_meta']['logLevelName']}\t${logObj['0']}\n`

            if (_rotatingFileStream !== undefined) {
                _rotatingFileStream.write(logMessage)
            } else {
                fs.appendFileSync(file, logMessage)
            }
        })

        _mainLogger.info(`Using log file [${file}]`)
    }

    export function getLogger(module: string) {
        if (!(module in _childLoggers)) {
            _childLoggers[module] = new ChildLogger(module, _mainLogger)
        }

        return _childLoggers[module]
    }
}
