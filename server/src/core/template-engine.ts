import fs from 'fs'
import { posix } from 'path'

import { getLogger } from './logmanager'
import type { DeviceTemplateDef } from '@/defs/device-template'
import { RegisteredDeviceClasses, RegisteredInterfaceClasses } from './config'

export type TemplateRegistry = {
    [type: string]: {
        [name: string]: DeviceTemplateDef
    }
}

var logger: ReturnType<typeof getLogger>

const _templateRegistry: TemplateRegistry = {}
var _deviceRegistrySchema: object = {}

const _allowedDeviceTemplateKeys = ['name', 'interfaces', 'logo']

export async function initTemplateEngine() {
    logger = getLogger('template-engine')

    scanTemplateInventory()
    buildDeviceRegistrySchema()
}

export function getDeviceRegistrySchema(): object {
    return _deviceRegistrySchema
}

function scanTemplateInventory() {
    logger.log('Scanning template inventory...')

    for (const filename of fs
        .readdirSync('./templates', {
            recursive: true,
        })
        .filter((item) => item.toString().endsWith('.json'))) {
        const path = posix.join('./templates', filename.toString())

        logger.debug(`Found template [${path}]`)

        const template = JSON.parse(
            fs.readFileSync(path, 'utf-8')
        ) as DeviceTemplateDef

        for (const type of Object.keys(template).filter(
            (item) => item in RegisteredDeviceClasses
        )) {
            if (!(type in _templateRegistry)) {
                _templateRegistry[type] = {}
            }

            _templateRegistry[type][template.name] = Object.keys(template)
                .filter((key) =>
                    [..._allowedDeviceTemplateKeys, type].includes(key)
                )
                .reduce((obj, key) => {
                    return {
                        ...obj,
                        [key]: template[key as keyof DeviceTemplateDef] as any,
                    }
                }, {}) as DeviceTemplateDef
        }
    }
}

function buildSchemaForInterfaces(interfaces: string[]) {
    return {
        type: 'object',
        properties: {
            interface: {
                type: 'string',
                title: '{{ device.interfaces.interface }}',
                enum: [...interfaces],
            },
        },

        required: ['interface'],

        dependencies: {
            interface: {
                oneOf: interfaces.map((currentInterface) => ({
                    properties: {
                        interface: {
                            enum: [currentInterface],
                        },

                        interfaceParameters:
                            RegisteredInterfaceClasses[
                                currentInterface
                            ]?.getParametersSchema(),
                    },
                })),
            },
        },
    }
}

function buildDevicePropertiesSchemaForType(type: string) {
    const subTemplate = _templateRegistry[type as keyof TemplateRegistry]

    return {
        type: 'object',
        properties: {
            device_model: {
                type: 'string',
                title: '{{ device.interfaces.deviceModel }}',
                enum: [...Object.keys(subTemplate).sort()],
            },
        },

        required: ['device_model'],

        dependencies: {
            device_model: {
                oneOf: Object.keys(subTemplate).map((model) => ({
                    properties: {
                        device_model: {
                            enum: [model],
                        },

                        interface: buildSchemaForInterfaces(
                            subTemplate[model as keyof TemplateRegistry]
                                .interfaces
                        ),
                    },
                })),
            },
        },
    }
}

function buildDeviceRegistrySchema() {
    _deviceRegistrySchema = {
        type: 'object',
        properties: {
            device_name: {
                type: 'string',
                title: '{{ device.interfaces.deviceName }}',
            },

            device_type: {
                type: 'string',
                title: '{{ device.interfaces.deviceType }}',
                enum: [...Object.keys(_templateRegistry).sort()],
            },
        },

        required: ['device_name', 'device_type'],

        dependencies: {
            device_type: {
                oneOf: Object.keys(_templateRegistry).map((type) => ({
                    properties: {
                        device_type: {
                            enum: [type],
                        },

                        device_model: buildDevicePropertiesSchemaForType(type),
                    },
                })),
            },
        },
    }
}

export function getTemplateForModel(type: string, model: string) {
    if (type in _templateRegistry) {
        const templatesForType = _templateRegistry[type]

        if (model in templatesForType) {
            return templatesForType[model]
        }
    }
    return undefined
}
