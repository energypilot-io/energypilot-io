import { ConnectorDef } from 'server/defs/configuration'
import { ParameterDef } from 'server/defs/template'

export const defaultConnectorConfig: ConnectorDef = {
    id: '',
    type: '',
    enabled: true,
}

export type InterfaceSchemaDef = {
    [propertyName: string]: {
        type: 'string' | 'number'
        defaultValue?: any
    }
}

export type InterfaceDef = {
    [groupName: string]: InterfaceSchemaDef
}

export abstract class IConnector {
    id: string
    templateInterfaceKey: string

    constructor(id: string, templateInterfaceKey: string) {
        this.id = id
        this.templateInterfaceKey = templateInterfaceKey
    }

    static getInterfaceDef(): InterfaceDef {
        return {}
    }

    abstract resetCache(): void
    abstract read(parameterDef: ParameterDef): Promise<number | undefined>
}
