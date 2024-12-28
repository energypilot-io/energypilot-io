import Modbus from 'jsmodbus'
import { Socket, SocketConnectOpts } from 'net'

import { ConnectorDef } from 'server/defs/configuration'
import { logging } from 'server/core/log-manager'
import { defaultParameterDef, ParameterDef } from 'server/defs/template'
import { defaultConnectorConfig, IConnector } from './IConnector'

type ModbusTCPConnectorDef = ConnectorDef & {
    modbusId: number
    host: string
    port: number
    timeout?: number
}

type ModbusTCPParameterDef = ParameterDef & {
    address: number
    size: number
    datatype:
        | 'int8'
        | 'uint8'
        | 'int16be'
        | 'int16le'
        | 'uint16be'
        | 'uint16le'
        | 'int32be'
        | 'int32le'
        | 'int32sw'
        | 'uint32be'
        | 'uint32le'
        | 'uint32sw'
        | 'bool8'
        | 'bool16'
        | 'bool32'
    bitmask?: number
}

const defaultModbusTCPConnectorDef: ModbusTCPConnectorDef = {
    ...defaultConnectorConfig,

    modbusId: 1,
    host: '',
    port: 0,
    timeout: 10000,
}

export class ModbusTCPConnector implements IConnector {
    templateInterfaceKey: string = 'modbus'
    id: string

    private _logger = logging.getLogger('interfaces.modbus-tcp')

    private _configuration: ModbusTCPConnectorDef

    private _socket: Socket = new Socket()
    private _client

    private _isShuttingDown: boolean = false

    constructor(modbusTCPConnectorDef: Partial<ModbusTCPConnectorDef> = {}) {
        this._configuration = {
            ...defaultModbusTCPConnectorDef,
            ...modbusTCPConnectorDef,
        }

        this.id = this._configuration.id

        if (this._configuration.enabled) {
            this._client = new Modbus.client.TCP(
                this._socket,
                this._configuration.modbusId,
                this._configuration.timeout
            )

            this._socket.on('error', (err) => {
                this.handleErrors(err)
            })

            this._socket.on('connect', () => {
                this._logger.info(
                    `Connected to [${this._configuration.host}:${this._configuration.port}]`
                )
            })

            this._socket.on('close', () => {
                if (!this._isShuttingDown) {
                    this._logger.warn(
                        `Lost connection to [${this._configuration.host}:${this._configuration.port}]. Trying to reconnect.`
                    )
                    setTimeout(
                        () => this.connect(),
                        this._configuration.timeout
                    )
                }
            })

            this.connect()
        }
    }

    public connect() {
        if (!this._isShuttingDown) {
            const options: SocketConnectOpts = {
                host: this._configuration.host,
                port: this._configuration.port,
            }

            this._socket.connect(options)
        }
    }

    public shutdown() {
        this._isShuttingDown = true
    }

    public async read(parameterDef: Partial<ParameterDef> = {}) {
        if (
            this._client === undefined ||
            this._client.connectionState === 'offline'
        )
            return undefined

        const modbusParameter = {
            ...defaultParameterDef,
            ...parameterDef,
        } as ModbusTCPParameterDef

        let value = await this._client!.readInputRegisters(
            modbusParameter.address,
            modbusParameter.size
        )
            .then(({ metrics, request, response }) => {
                if (response.bodyLength < 2) return undefined

                const buffer = response.body.valuesAsBuffer
                switch (modbusParameter.datatype) {
                    case 'int8':
                    case 'bool8':
                        return buffer.readInt8() * modbusParameter.scale
                    case 'uint8':
                        return buffer.readUInt8() * modbusParameter.scale
                    case 'int16be':
                        return buffer.readInt16BE() * modbusParameter.scale
                    case 'int16le':
                        return buffer.readInt16LE() * modbusParameter.scale
                    case 'uint16be':
                    case 'bool16':
                        return buffer.readUInt16BE() * modbusParameter.scale
                    case 'uint16le':
                        return buffer.readUInt16LE() * modbusParameter.scale
                    case 'int32be':
                        return buffer.readInt32BE() * modbusParameter.scale
                    case 'int32le':
                        return buffer.readInt32LE() * modbusParameter.scale
                    case 'int32sw':
                        return (
                            buffer.swap16().readInt32LE() *
                            modbusParameter.scale
                        )
                    case 'uint32be':
                    case 'bool32':
                        return buffer.readUInt32BE() * modbusParameter.scale
                    case 'uint32le':
                        return buffer.readUInt32LE() * modbusParameter.scale
                    case 'uint32sw':
                        return (
                            buffer.swap16().readUInt32LE() *
                            modbusParameter.scale
                        )
                }
            })
            .catch((err) => {
                this.handleErrors(err)
                return undefined
            })

        if (value !== undefined) {
            if (modbusParameter.bitmask !== undefined) {
                value &= modbusParameter.bitmask
            }

            if (
                ['bool8', 'bool16', 'bool32'].indexOf(
                    modbusParameter.datatype
                ) > -1
            ) {
                value = value > 0 ? 1 : 0
            }
        }

        return value
    }

    private handleErrors(err: any) {
        if (Modbus.errors.isUserRequestError(err)) {
            switch (err.err) {
                case 'OutOfSync':
                case 'Protocol':
                case 'Timeout':
                case 'ManuallyCleared':
                case 'ModbusException':
                case 'Offline':
                case 'crcMismatch':
                    this._logger.error(
                        'Error Message: ' + err.message,
                        'Error' + 'Modbus Error Type: ' + err.err
                    )
                    break
            }
        } else if (Modbus.errors.isInternalException(err)) {
            this._logger.error(
                'Error Message: ' + err.message,
                'Error' + 'Error Name: ' + err.name,
                err.stack
            )
        } else {
            this._logger.error('Unknown Error', err)
        }
    }
}
