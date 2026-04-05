import { Device } from '@/entities/device.entity'
import { getEntityManager } from './database'
import { ChildLogger, getLogger } from './logmanager'
import { IInterface } from '@/interfaces/interface'
import { RegisteredDeviceClasses, RegisteredInterfaceClasses } from './config'
import { DeviceBase, DeviceDefinition } from '@/devices/device.base'

let _logger: ChildLogger

const _interfaceInstances: { [key: string]: IInterface } = {}
const _deviceInstances: { [key: string]: DeviceBase } = {}

type DeviceRegistry = {
    [type: string]: {
        [name: string]: DeviceDefinition
    }
}

type DeviceClass = {
    new (interfaceInstance: IInterface, deviceDefinition: Device): DeviceBase
    getDeviceDefinition(): DeviceDefinition
}

var _deviceRegistry: DeviceRegistry = {}
var _deviceRegistrySchema: object = {}

export async function initDeviceManager() {
    _logger = getLogger('device-manager')

    buildDeviceRegistry()
    buildDeviceRegistrySchema()

    getEntityManager()
        .findAll(Device)
        .then(devices => {
            devices.forEach(device => {
                _logger.info(`Loaded device [${device.name}] from database`)

                createDevice(device)
            })
        })
}

export function getDeviceRegistrySchema(): object {
    return _deviceRegistrySchema
}

function buildDeviceRegistry() {
    for (const deviceClass of RegisteredDeviceClasses) {
        const deviceDefinition: DeviceDefinition =
            deviceClass.getDeviceDefinition()

        for (const deviceType of deviceDefinition.types) {
            if (!(deviceType in _deviceRegistry)) {
                _deviceRegistry[deviceType] = {}
            }

            _deviceRegistry[deviceType][deviceDefinition.model] =
                deviceDefinition
        }
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
                enum: [...Object.keys(_deviceRegistry).sort()],
            },
        },

        required: ['device_name', 'device_type'],

        dependencies: {
            device_type: {
                oneOf: Object.keys(_deviceRegistry).map(type => ({
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

function buildDevicePropertiesSchemaForType(type: string) {
    const subTemplate = _deviceRegistry[type as keyof DeviceRegistry]

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
                oneOf: Object.keys(subTemplate).map(model => ({
                    properties: {
                        device_model: {
                            enum: [model],
                        },

                        interface: buildSchemaForInterfaces(
                            subTemplate[model as keyof DeviceRegistry]
                                .interfaces
                        ),
                    },
                })),
            },
        },
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
                oneOf: interfaces.map(currentInterface => ({
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

function createInterface(interfaceName: string, properties: string) {
    if (!(interfaceName + properties in _interfaceInstances)) {
        if (!(interfaceName in RegisteredInterfaceClasses)) {
            getLogger('devices').error(
                `No class found for interface [${interfaceName}]`
            )
        } else {
            _interfaceInstances[interfaceName + properties] =
                new RegisteredInterfaceClasses[interfaceName](
                    JSON.parse(properties)
                )
        }
    }

    return _interfaceInstances[interfaceName + properties]
}

export function getDeviceClassForDeviceDefinition(
    device: Device
): DeviceClass | undefined {
    for (const deviceClass of RegisteredDeviceClasses as DeviceClass[]) {
        const deviceDefinition: DeviceDefinition =
            deviceClass.getDeviceDefinition()

        if (
            deviceDefinition.model === device.model &&
            deviceDefinition.types.includes(device.type) &&
            deviceDefinition.interfaces.includes(device.interface)
        ) {
            return deviceClass
        }
    }

    return undefined
}

export async function createDevice(deviceDefinition: Device) {
    const logger = getLogger('device-manager')

    if (deviceDefinition.name in _deviceInstances) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: A device with the name already exists.`
        )
        return undefined
    }

    const interfaceInstance = createInterface(
        deviceDefinition.interface,
        deviceDefinition.properties
    )

    if (interfaceInstance === undefined) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: not able to create interface instance.`
        )
        return undefined
    }

    const deviceClass = getDeviceClassForDeviceDefinition(deviceDefinition)
    if (deviceClass === undefined) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: No class found for device definition [${deviceDefinition.type}/${deviceDefinition.model}] with interface [${deviceDefinition.interface}].`
        )
        return undefined
    }

    _deviceInstances[deviceDefinition.name] = new deviceClass(
        interfaceInstance,
        deviceDefinition
    )
    return _deviceInstances[deviceDefinition.name]
}

export function removeDevice(deviceName: string) {
    if (deviceName in _deviceInstances) {
        delete _deviceInstances[deviceName]
    }
}

export function resetAllDeviceCaches() {
    Object.keys(_interfaceInstances).forEach(interfaceKey => {
        _interfaceInstances[interfaceKey].resetCache()
    })
}

export function getDeviceInstances() {
    return _deviceInstances
}
