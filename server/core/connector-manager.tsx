import { ConnectorDef } from 'server/defs/configuration'
import { logging } from './log-manager'
import { ModbusTCPConnector } from 'server/connectors/modbus-tcp-connector'
import {
    defaultConnectorConfig,
    IConnector,
} from 'server/connectors/IConnector'
import { TPLinkTapoConnector } from 'server/connectors/tplink-tapo-connector'

export const connectorClasses: { [id: string]: any } = {
    'modbus-tcp': ModbusTCPConnector,
    tapo: TPLinkTapoConnector,
}

var _logger: logging.ChildLogger

const _connectorInstances: { [key: string]: IConnector } = {}

export namespace connectors {
    export function initConnectors(
        connectorDefs: Partial<ConnectorDef>[] | undefined
    ) {
        _logger = logging.getLogger('connectors')

        if (connectorDefs === undefined) return

        connectorDefs.forEach((connectorDef) => {
            const configuration = { ...defaultConnectorConfig, ...connectorDef }

            if (!(configuration.interface in connectorClasses)) {
                _logger.warn(
                    `No class found for connector type'${connectorDef.interface}`
                )
            } else {
                if (configuration.id in _connectorInstances) {
                    _logger.warn(
                        `Cannot create connector with id [${configuration.id}]. The id is already existing.`
                    )
                } else {
                    _connectorInstances[configuration.id] =
                        new connectorClasses[configuration.interface](
                            connectorDef
                        )
                }
            }
        })
    }

    export function getConnectorByID(id: string | undefined) {
        if (id !== undefined && id in _connectorInstances) {
            return _connectorInstances[id]
        }

        return undefined
    }
}
