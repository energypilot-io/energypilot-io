import fs from 'fs'
import { posix } from 'path'

import { getLogger } from './logmanager'
import type { DeviceTemplateDef } from '@/defs/device-template'

export const ValidTemplateTypes: string[] = [
    'pv',
    'battery',
    'grid',
    'consumer',
]

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
            (item) => ValidTemplateTypes.indexOf(item) > -1
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

function buildDevicePropertiesSchemaForType(type: string) {
    return {
        type: 'object',
        properties: {
            device_model: {
                type: 'string',
                enum: [
                    ...Object.keys(
                        _templateRegistry[type as keyof TemplateRegistry]
                    ).sort(),
                ],
            },
        },

        required: ['device_model'],
    }
}

function buildDeviceRegistrySchema() {
    _deviceRegistrySchema = {
        type: 'object',
        properties: {
            device_type: {
                type: 'string',
                enum: [...Object.keys(_templateRegistry).sort()],
            },
        },

        required: ['device_type'],

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
