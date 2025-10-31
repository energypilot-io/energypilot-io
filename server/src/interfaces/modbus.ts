import { Socket } from 'net'

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

import AsciiTransport from '@/libs/cs-modbus/transports/AsciiTransport'

import { defaultParameterDef, ParameterDef } from '@/defs/device-template'
import { ChildLogger, getLogger } from '@/core/logmanager'
import { IInterface } from './interface'

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

export class ModbusInterface extends IInterface {
    private _logger: ChildLogger

    private _cache: { [key: string]: Buffer } = {}

    private _properties: { [property: string]: any }

    private _connection: any
    private _transport: any
    private _master: any

    constructor(properties: { [property: string]: any }) {
        super('modbus')

        this._properties = properties
        this._logger = getLogger(`interfaces.modbus`)

        switch (this._properties['connectionType']) {
            case 'tcpip': {
                this._connection = new TcpConnection({
                    socket: new Socket(),
                    host: this._properties['host'],
                    port: this._properties['port'],
                    autoConnect: true,
                    autoReconnect: true,
                    minConnectTime: 2500,
                    maxReconnectTime: 5000,
                })
                break
            }

            case 'serial': {
                this._connection = new SerialConnection(
                    new SerialPort({
                        path: this._properties['device'],
                        baudRate: this._properties['baud'],
                    })
                )
                break
            }

            default:
                throw Error(
                    `Unknown connection type set for modbus interface [modbus]: ${this._properties['connectionType']}`
                )
        }

        switch (this._properties['transport']) {
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

        if (this._connection === undefined || this._transport === undefined) {
            this._logger.error(
                `Error while creating interface instance with properties [${JSON.stringify(
                    properties
                )}]`
            )
            return
        }

        this._master = new Master({
            transport: this._transport,
            suppressTransactionErrors: false,
            retryOnException: false,
            maxConcurrentRequests: 1,
            defaultUnit: this._properties['modbusId'],
            defaultMaxRetries: 0,
            defaultTimeout: this._properties['timeout'],
        })

        this._connection.on('error', (err: any) => {
            this._logger.error(
                'Error Message: ' + err.message,
                'Error' + 'Modbus Error Type: ' + err.err
            )
        })

        this._connection.on('write', (data: any) => {
            this._logger.verbose(`Writing data: ${data.toString('hex')}`)
        })

        this._connection.on('data', (data: any) => {
            this._logger.verbose(`Receive data: ${data.toString('hex')}`)
        })

        this._master.on('connected', () => {
            var message: string = ''

            switch (this._properties['connectionType']) {
                case 'tcpip': {
                    message = `Connected to [${this._properties['host']}:${this._properties['port']}]`
                    break
                }

                case 'serial': {
                    message = `Connected to [${this._properties['device']}:${this._properties['baud']}]`
                    break
                }
            }

            this._logger.log(message)
        })

        this._master.on('disconnected', () => {
            var message: string = ''

            switch (this._properties['connectionType']) {
                case 'tcpip': {
                    message = `Disconnected from [${this._properties['host']}:${this._properties['port']}]`
                    break
                }

                case 'serial': {
                    message = `Disconnected from [${this._properties['device']}:${this._properties['baud']}]`
                    break
                }
            }

            this._logger.log(message)
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

    static getParametersSchema(): object {
        return {
            type: 'object',

            properties: {
                connectionType: {
                    type: 'string',
                    enum: ['tcpip', 'serial'],
                    default: 'tcpip',
                    widget: {
                        formlyConfig: {
                            type: 'radio',
                        },
                    },
                },

                transport: {
                    type: 'string',
                    enum: ['ip', 'rtu', 'ascii'],
                    default: 'ip',
                },

                modbusId: {
                    type: 'number',
                    minimum: 1,
                    maximum: 247,
                    default: 1,
                },

                timeout: {
                    type: 'number',
                    minimum: 100,
                    default: 2500,
                },
            },

            required: ['connectionType', 'transport', 'modbusId', 'timeout'],

            dependencies: {
                connectionType: {
                    oneOf: [
                        {
                            properties: {
                                connectionType: {
                                    enum: ['tcpip'],
                                },

                                host: {
                                    type: 'string',
                                },

                                port: {
                                    type: 'number',
                                    minimum: 1,
                                    maximum: 65535,
                                    default: 502,
                                },
                            },

                            required: ['host', 'port'],
                        },

                        {
                            properties: {
                                connectionType: {
                                    enum: ['serial'],
                                },

                                device: {
                                    type: 'string',
                                },

                                baud: {
                                    type: 'number',
                                    minimum: 1,
                                    default: 19200,
                                },
                            },

                            required: ['device', 'baud'],
                        },
                    ],
                },
            },
        }
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
            transaction.setUnit(this._properties['modbusId'])
            transaction.setTimeout(this._properties['timeout'])

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
