import { IFormParameterDefList } from 'server/defs/form-parameters'
import { ParameterDef } from 'server/defs/template'

export type InterfaceDef = {
    [groupName: string]: IFormParameterDefList
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
