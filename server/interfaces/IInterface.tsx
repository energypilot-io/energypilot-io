import { ParameterDef } from 'server/defs/template'

export type InterfaceSchemaDef = {
    [propertyName: string]: {
        type: 'string' | 'number' | 'email' | 'password' | 'ip' | 'enum'
        defaultValue?: any
        enumValues?: readonly string[]
    }
}

export type InterfaceDef = {
    [groupName: string]: InterfaceSchemaDef
}

export type TranslationDef = {
    [lang: string]: {
        [key: string]: any
    }
}

export abstract class IInterface {
    templateInterfaceKey: string

    constructor(templateInterfaceKey: string) {
        this.templateInterfaceKey = templateInterfaceKey
    }

    static getInterfaceDef(): InterfaceDef {
        return {}
    }

    static getTranslations(): TranslationDef {
        return {}
    }

    abstract resetCache(): void
    abstract read(parameterDef: ParameterDef): Promise<number | undefined>
}
