export type HTTPDef = {
    port?: number
}

export type DatabaseDef = {
    filename?: string
}

export type ConfigurationDef = {
    database?: DatabaseDef
    http?: HTTPDef
}
