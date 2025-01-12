import { ConnectorDef } from 'server/defs/configuration'
import { ParameterDef } from 'server/defs/template'

export const defaultConnectorConfig: ConnectorDef = {
    id: '',
    type: '',
    enabled: true,
}

export interface IConnector {
    id: string
    templateInterfaceKey: string

    resetCache: () => void

    read: (parameterDef: ParameterDef) => Promise<number | undefined>
}
