export type ParameterDef = {
    scale: number
}

export type StaticValueDef = {
    staticValue: number
}

export type ModifierDef = {
    modifier: 'add' | 'sub' | 'mul' | 'div'
    values: ParameterDef[]
}

export type GridTemplateDef = {
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    energy: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type PVTemplateDef = {
    power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    energy: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
}

export type BatteryTemplateDef = {
    soc: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    charge_power: { [key: string]: ModifierDef | StaticValueDef | ParameterDef }
    discharge_power: {
        [key: string]: ModifierDef | StaticValueDef | ParameterDef
    }
}

export type TemplateDef = {
    grid: GridTemplateDef
    pv: PVTemplateDef
    battery: BatteryTemplateDef
}

export const defaultParameterDef: ParameterDef = {
    scale: 1,
}
