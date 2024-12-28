import { ConnectorDef } from 'server/defs/configuration'
import { ParameterDef } from 'server/defs/template'

export const defaultConnectorConfig: ConnectorDef = {
    id: '',
    interface: '',
    enabled: true,
}

export interface IConnector {
    id: string
    templateInterfaceKey: string

    read: (parameterDef: ParameterDef) => Promise<number | undefined>
}
