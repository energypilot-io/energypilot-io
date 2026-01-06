import { defaultParameterDef, ParameterDef } from '@/defs/device-template'
import { ChildLogger, getLogger } from '@/core/logmanager'
import { IInterface } from './interface'

import { loginDeviceByIp } from 'tp-link-tapo-connect'
import { title } from 'node:process'

type TPLinkTapoParameterDef = ParameterDef & {
    request: string
    parameter: string
}

export class TPLinkTapoInterface extends IInterface {
    private _logger: ChildLogger

    private _cache: { [key: string]: any } = {}

    private _properties: { [property: string]: any }

    private _device: any

    constructor(properties: { [property: string]: any }) {
        super('tapo')

        this._logger = getLogger('interfaces.tapo')
        this._properties = properties
    }

    static getParametersSchema(): object {
        return {
            type: 'object',

            properties: {
                email: {
                    title: '{{ device.interfaces.tapo.parameters.email }}',
                    type: 'input',
                    templateOptions: {
                        type: 'email',
                    },
                    default: 'user@provider.com',
                },

                password: {
                    title: '{{ device.interfaces.tapo.parameters.password }}',
                    type: 'input',
                    templateOptions: {
                        type: 'password',
                    },
                },

                ip: {
                    title: '{{ device.interfaces.tapo.parameters.ip }}',
                    type: 'string',
                },
            },

            required: ['email', 'password', 'ip'],
        }
    }

    private async connect(email: string, password: string, ip: string) {
        if (this._device !== undefined) return

        try {
            this._device = await loginDeviceByIp(email, password, ip)
            this._logger.log(`Connected to [${this._properties.ip}]`)
        } catch {
            this._device = undefined
            this._logger.error(`Error connecting to [${this._properties.ip}]`)
        }
    }

    public resetCache() {
        this._cache = {}
    }

    public async read(parameterDef: Partial<ParameterDef> = {}) {
        await this.connect(
            this._properties['email'],
            this._properties['password'],
            this._properties['ip']
        )

        if (this._device === undefined) return undefined

        const tplinkTapoParameter = {
            ...defaultParameterDef,
            ...parameterDef,
        } as TPLinkTapoParameterDef

        let response
        if (tplinkTapoParameter.request in this._cache) {
            response = this._cache[tplinkTapoParameter.request]
        } else {
            try {
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
            } catch {
                this._device = undefined
                this._logger.error(
                    `Error reading parameter from device [${this._properties.ip}]`
                )
                return undefined
            }

            this._cache[tplinkTapoParameter.request] = response
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
