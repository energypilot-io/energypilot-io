export type FileLoggingDef = {
    filename?: string
    rotatingFiles?: boolean
    size?: string
    interval?: string
    compress?: string
}

export type LoggingDef = {
    loggers?: string[]
    logLevels?: { [module: string]: string }
    file?: FileLoggingDef
}

export type HTTPDef = {
    port?: number
}

export type DatabaseDef = {
    filename?: string
}

export type UpdateDef = {
    polling?: number
    snapshot?: number
}

export type ConfigurationDef = {
    logging?: LoggingDef
    database?: DatabaseDef
    http?: HTTPDef

    update?: UpdateDef
}
