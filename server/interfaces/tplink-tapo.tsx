import { defaultParameterDef, ParameterDef } from 'server/defs/template'
import { IInterface, InterfaceDef, TranslationDef } from './IInterface'

import { loginDeviceByIp } from 'tp-link-tapo-connect'
import { ChildLogger, getLogger } from 'server/core/logmanager'

type TPLinkTapoParameterDef = ParameterDef & {
    request: string
    parameter: string
}

export class TPLinkTapoConnector extends IInterface {
    private _logger: ChildLogger

    private _cache: { [key: string]: any } = {}

    private _properties: { [property: string]: any }

    private _device: any

    constructor(properties: { [property: string]: any }) {
        super('tapo')

        this._logger = getLogger('interfaces.tapo')
        this._properties = properties

        this.connect(
            this._properties['email'],
            this._properties['password'],
            this._properties['ip']
        )
    }

    static getTranslations(): TranslationDef {
        return {
            en: {
                default: {
                    email: 'E-Mail',
                    password: 'Password',
                    ip: 'IP',
                },
            },

            de: {
                default: {
                    password: 'Passwort',
                },
            },
        }
    }

    static getInterfaceDef(): InterfaceDef {
        return {
            default: {
                email: {
                    type: 'email',
                },
                password: {
                    type: 'password',
                },
                ip: {
                    type: 'ip',
                },
            },
        }
    }

    private async connect(email: string, password: string, ip: string) {
        this._device = await loginDeviceByIp(email, password, ip)
        this._logger.log(`Connected to [${this._properties.ip}]`)
    }

    public resetCache() {
        this._cache = {}
    }

    public async read(parameterDef: Partial<ParameterDef> = {}) {
        if (this._device === undefined) return undefined

        const tplinkTapoParameter = {
            ...defaultParameterDef,
            ...parameterDef,
        } as TPLinkTapoParameterDef

        let response
        if (tplinkTapoParameter.request in this._cache) {
            response = this._cache[tplinkTapoParameter.request]
        } else {
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
