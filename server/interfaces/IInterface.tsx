import { ParameterDef } from 'server/defs/template'

export type InterfaceSchemaDef = {
    [propertyName: string]: {
        type: 'string' | 'number' | 'email' | 'password' | 'ip'
        defaultValue?: any
    }
}

export type InterfaceDef = {
    [groupName: string]: InterfaceSchemaDef
}

export abstract class IInterface {
    templateInterfaceKey: string

    constructor(templateInterfaceKey: string) {
        this.templateInterfaceKey = templateInterfaceKey
    }

    static getInterfaceDef(): InterfaceDef {
        return {}
    }

    abstract resetCache(): void
    abstract read(parameterDef: ParameterDef): Promise<number | undefined>
}
