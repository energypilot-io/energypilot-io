export type ParameterDef = {
    scale: number
}

export type StaticValueDef = {
    staticValue: number
}

export type ModifierDef = {
    modifier: 'add' | 'sub' | 'mul' | 'div'
    values: ParameterDef[]
    scale?: number
}

export type BaseDeviceTemplateDef = {
    enabled: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type GridTemplateDef = BaseDeviceTemplateDef & {
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }

    energyImport: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    energyExport: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type PVTemplateDef = BaseDeviceTemplateDef & {
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    energy: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type BatteryTemplateDef = BaseDeviceTemplateDef & {
    soc: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type ConsumerTemplateDef = BaseDeviceTemplateDef & {
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    energy: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type TemplateDef = {
    name: string
    interfaces: string[]
    logo?: string

    grid?: GridTemplateDef
    pv?: PVTemplateDef
    battery?: BatteryTemplateDef
    consumer?: ConsumerTemplateDef
}

export const defaultParameterDef: ParameterDef = {
    scale: 1,
}
