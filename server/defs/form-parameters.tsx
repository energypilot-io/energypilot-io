export type IFormParameterDef = {
    type: 'string' | 'number' | 'email' | 'password' | 'ip' | 'enum'
    defaultValue?: any
    enumValues?: readonly string[]
    min?: number
    max?: number
    unit?: string
}

export type IFormParameterDefList = { [name: string]: IFormParameterDef }
