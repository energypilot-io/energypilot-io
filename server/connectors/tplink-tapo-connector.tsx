import { ConnectorDef } from 'server/defs/configuration'
import { logging } from 'server/core/log-manager'
import { defaultParameterDef, ParameterDef } from 'server/defs/template'
import { defaultConnectorConfig, IConnector } from './IConnector'

import { loginDeviceByIp } from 'tp-link-tapo-connect'

type TPLinkTapoConnectorDef = ConnectorDef & {
    email: string
    password: string
    ip: string
    timeout?: number
}

type TPLinkTapoParameterDef = ParameterDef & {
    request: string
    parameter: string
}

const defaultTapoP110ConnectorDef: TPLinkTapoConnectorDef = {
    ...defaultConnectorConfig,

    email: '',
    password: '',
    ip: '',
    timeout: 10000,
}

export class TPLinkTapoConnector implements IConnector {
    templateInterfaceKey: string = 'tapo'
    id: string

    private _logger = logging.getLogger('interfaces.tapo')

    private _configuration: TPLinkTapoConnectorDef

    private _device: any

    constructor(modbusTCPConnectorDef: Partial<TPLinkTapoConnectorDef> = {}) {
        this._configuration = {
            ...defaultTapoP110ConnectorDef,
            ...modbusTCPConnectorDef,
        }

        this.id = this._configuration.id

        if (this._configuration.enabled) {
            this.connect(
                this._configuration.email,
                this._configuration.password,
                this._configuration.ip
            )
        }
    }

    private async connect(email: string, password: string, ip: string) {
        this._device = await loginDeviceByIp(email, password, ip)
        this._logger.info(`Connected to [${this._configuration.ip}]`)
    }

    public async read(parameterDef: Partial<ParameterDef> = {}) {
        if (this._device === undefined) return undefined

        const tplinkTapoParameter = {
            ...defaultParameterDef,
            ...parameterDef,
        } as TPLinkTapoParameterDef

        let response
        switch (tplinkTapoParameter.request) {
            case 'getEnergyUsage':
                response = await this._device.getEnergyUsage()
                break

            case 'getDeviceInfo':
                response = await this._device.getDeviceInfo()
                break

            default:
                return undefined
        }

        if (
            response === undefined ||
            !(tplinkTapoParameter.parameter in response)
        )
            return undefined

        return (
            Number.parseFloat(response[tplinkTapoParameter.parameter]) *
            tplinkTapoParameter.scale
        )
    }
}
