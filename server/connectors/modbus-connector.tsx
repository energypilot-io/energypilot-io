import { Socket } from 'net'

import { ConnectorDef } from 'server/defs/configuration'
import { logging } from 'server/core/log-manager'
import { defaultParameterDef, ParameterDef } from 'server/defs/template'
import { defaultConnectorConfig, IConnector } from './IConnector'
import * as zod from 'zod'

import { SerialPort } from 'serialport'

// @ts-ignore
import TcpConnection from '@csllc/cs-modbus/lib/connections/TcpConnection'
// @ts-ignore
import SerialConnection from '@csllc/cs-modbus/lib/connections/SerialConnection'
// @ts-ignore
import IpTransport from '@csllc/cs-modbus/lib/transports/IpTransport'
// @ts-ignore
import RtuTransport from '@csllc/cs-modbus/lib/transports/RtuTransport'
// @ts-ignore
import Master from '@csllc/cs-modbus/lib/Master'
// @ts-ignore
import Transaction from '@csllc/cs-modbus/lib/Transaction'
// @ts-ignore
import functions from '@csllc/cs-modbus/lib/functions'

import AsciiTransport from 'server/libs/cs-modbus/transports/AsciiTransport'

type ModbusConnectorDef = ConnectorDef & {
    interface?: 'tcp' | 'serial'
    transport?: 'ip' | 'rtu' | 'ascii'

    modbusId?: number
    timeout?: number
}

type ModbusTCPConnectorDef = ModbusConnectorDef & {
    host: string
    port?: number
}

type ModbusSerialConnectorDef = ModbusConnectorDef & {
    device: string
    baudRate?: number
}

type ModbusParameterDef = ParameterDef & {
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
    register?: 'input' | 'holding'
    bitmask?: number
    offset?: number
}

const defaultModbusConnectorDef: ModbusConnectorDef = {
    ...defaultConnectorConfig,

    interface: 'tcp',
    transport: 'ip',

    modbusId: 1,
    timeout: 2500,
}

const defaultModbusTCPConnectorDef: ModbusTCPConnectorDef = {
    ...defaultModbusConnectorDef,

    host: '',
    port: 502,
}

const defaultModbusSerialConnectorDef: ModbusSerialConnectorDef = {
    ...defaultModbusConnectorDef,

    device: '',
    baudRate: 9600,
}

export class ModbusConnector extends IConnector {
    private _logger

    private _cache: { [key: string]: Buffer } = {}

    private _configuration:
        | ModbusConnectorDef
        | ModbusTCPConnectorDef
        | ModbusSerialConnectorDef

    private _connection: any
    private _transport: any
    private _master: any

    constructor(modbusConnectorDef: Partial<ModbusTCPConnectorDef> = {}) {
        const configuration = {
            ...defaultModbusConnectorDef,
            ...modbusConnectorDef,
        }

        super(configuration.id, 'modbus')

        this._configuration = configuration
        this._logger = logging.getLogger(`connectors.${this._configuration.id}`)

        if (!this._configuration.enabled) return

        switch (this._configuration.interface) {
            case 'tcp': {
                const configuration = {
                    ...defaultModbusTCPConnectorDef,
                    ...modbusConnectorDef,
                }

                this._connection = new TcpConnection({
                    socket: new Socket(),
                    host: configuration.host,
                    port: configuration.port,
                    autoConnect: true,
                    autoReconnect: true,
                    minConnectTime: 2500,
                    maxReconnectTime: 5000,
                })
                break
            }

            case 'serial': {
                const configuration = {
                    ...defaultModbusSerialConnectorDef,
                    ...modbusConnectorDef,
                }

                this._connection = new SerialConnection(
                    new SerialPort({
                        path: configuration.device,
                        baudRate: configuration.baudRate,
                    })
                )
                break
            }

            default:
                throw Error(
                    `Unknown interface set for modbus connector [${this._configuration.interface}]`
                )
        }

        switch (this._configuration.transport) {
            case 'ascii':
                this._transport = new AsciiTransport(this._connection)
                break
            case 'ip':
                this._transport = new IpTransport(this._connection)
                break
            case 'rtu':
                this._transport = new RtuTransport({
                    connection: this._connection,
                })
                break
        }

        this._master = new Master({
            transport: this._transport,
            suppressTransactionErrors: false,
            retryOnException: false,
            maxConcurrentRequests: 1,
            defaultUnit: this._configuration.modbusId,
            defaultMaxRetries: 0,
            defaultTimeout: this._configuration.timeout,
        })

        this._connection.on('error', (err: any) => {
            this._logger.error(
                'Error Message: ' + err.message,
                'Error' + 'Modbus Error Type: ' + err.err
            )
        })

        this._connection.on('write', (data: any) => {
            this._logger.trace(`Writing data: ${data.toString('hex')}`)
        })

        this._connection.on('data', (data: any) => {
            this._logger.trace(`Receive data: ${data.toString('hex')}`)
        })

        this._master.on('connected', () => {
            var message: string = ''

            switch (this._configuration.interface) {
                case 'tcp': {
                    const configuration = {
                        ...defaultModbusTCPConnectorDef,
                        ...modbusConnectorDef,
                    }
                    message = `Connected to [${configuration.host}:${configuration.port}]`
                    break
                }

                case 'serial': {
                    const configuration = {
                        ...defaultModbusSerialConnectorDef,
                        ...modbusConnectorDef,
                    }
                    message = `Connected to [${configuration.device}], Baud Rate: ${configuration.baudRate}]`
                    break
                }
            }

            this._logger.info(message)
        })

        this._master.on('disconnected', () => {
            var message: string = ''

            switch (this._configuration.interface) {
                case 'tcp': {
                    const configuration = {
                        ...defaultModbusTCPConnectorDef,
                        ...modbusConnectorDef,
                    }
                    message = `Disconnected from [${configuration.host}:${configuration.port}]`
                    break
                }

                case 'serial': {
                    const configuration = {
                        ...defaultModbusSerialConnectorDef,
                        ...modbusConnectorDef,
                    }
                    message = `Disconnected from [${configuration.device}], Baud Rate: ${configuration.baudRate}]`
                    break
                }
            }

            this._logger.info(message)
        })

        this._master.on('error', (err: any) => {
            this._logger.error(
                'Error Message: ' + err.message,
                'Error' + 'Modbus Error Type: ' + err.err
            )
        })

        process.on('SIGTERM', () => {
            if (this._connection !== undefined) {
                this._connection.destroy()
            }
        })

        process.on('exit', (code) => {
            if (this._connection !== undefined) {
                this._connection.destroy()
            }
        })
    }

    static getConnectorParameterDefs() {
        return {
            host: {
                type: 'string',
            },
            port: {
                type: 'number',
            },
        }
    }

    private getParameterValue(
        buffer: Buffer,
        parameterDef: ModbusParameterDef
    ): number | undefined {
        var value: number | undefined = undefined

        const offset = parameterDef.offset ?? 0

        if (offset > buffer.length - 1) return value

        switch (parameterDef.datatype) {
            case 'int8':
            case 'bool8':
                value = buffer.readInt8(offset) * parameterDef.scale
                break
            case 'uint8':
                value = buffer.readUInt8(offset) * parameterDef.scale
                break
            case 'int16be':
                value = buffer.readInt16BE(offset) * parameterDef.scale
                break
            case 'int16le':
                value = buffer.readInt16LE(offset) * parameterDef.scale
                break
            case 'uint16be':
            case 'bool16':
                value = buffer.readUInt16BE(offset) * parameterDef.scale
                break
            case 'uint16le':
                value = buffer.readUInt16LE(offset) * parameterDef.scale
                break
            case 'int32be':
                value = buffer.readInt32BE(offset) * parameterDef.scale
                break
            case 'int32le':
                value = buffer.readInt32LE(offset) * parameterDef.scale
                break
            case 'int32sw':
                value = buffer.swap16().readInt32LE(offset) * parameterDef.scale
                break
            case 'uint32be':
            case 'bool32':
                value = buffer.readUInt32BE(offset) * parameterDef.scale
                break
            case 'uint32le':
                value = buffer.readUInt32LE(offset) * parameterDef.scale
                break
            case 'uint32sw':
                value =
                    buffer.swap16().readUInt32LE(offset) * parameterDef.scale
                break
        }

        if (value !== undefined) {
            if (parameterDef.bitmask !== undefined) {
                value &= parameterDef.bitmask
            }

            if (
                ['bool8', 'bool16', 'bool32'].indexOf(parameterDef.datatype) >
                -1
            ) {
                value = value > 0 ? 1 : 0
            }
        }

        return value
    }

    public resetCache() {
        this._cache = {}
    }

    public async read(
        parameterDef: Partial<ParameterDef> = {}
    ): Promise<number | undefined> {
        return new Promise<number | undefined>((resolve) => {
            if (this._master === undefined || this._connection === undefined)
                return resolve(undefined)

            const modbusParameter = {
                ...defaultParameterDef,
                ...parameterDef,
            } as ModbusParameterDef

            const cacheKey = JSON.stringify({
                address: modbusParameter.address,
                size: modbusParameter.size,
                register: modbusParameter.register ?? 'input',
            })

            if (cacheKey in this._cache) {
                const buffer = this._cache[cacheKey]
                return resolve(this.getParameterValue(buffer, modbusParameter))
            }

            var request: any = undefined
            switch (modbusParameter.register ?? 'input') {
                case 'input': {
                    request = new functions.ReadInputRegistersRequest(
                        modbusParameter.address,
                        modbusParameter.size
                    )
                    break
                }

                case 'holding': {
                    request = new functions.ReadHoldingRegistersRequest(
                        modbusParameter.address,
                        modbusParameter.size
                    )
                    break
                }
            }

            if (request === undefined) {
                return resolve(undefined)
            }

            const transaction: any = new Transaction(request)
            transaction.setUnit(this._configuration.modbusId)
            transaction.setTimeout(this._configuration.timeout)

            transaction.on('error', (err: any) => {
                this._logger.error(`Transaction error: [${err}]`)
                return resolve(undefined)
            })

            transaction.on('complete', (err: any, response: any) => {
                if (err) {
                    return resolve(undefined)
                } else {
                    const buffer: Buffer = response.getValues()
                    this._cache[cacheKey] = buffer

                    return resolve(
                        this.getParameterValue(buffer, modbusParameter)
                    )
                }
            })

            this._master.execute(transaction)
        })
    }
}
