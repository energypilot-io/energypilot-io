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

export type ConnectorDef = {
    id: string
    interface: 'modbus-tcp' | 'modbus-serial' | ''
    enabled?: boolean
}

export type DeviceDef = {
    id: string
    connector?: string
    type?: 'grid' | 'pv' | 'battery'
    template?: string
}

export type HTTPDef = {
    port?: number
}

export type DatabaseDef = {
    filename?: string
}

export type ConfigurationDef = {
    logging?: LoggingDef
    database?: DatabaseDef
    http?: HTTPDef

    connectors?: ConnectorDef[]
    devices?: DeviceDef[]
}
