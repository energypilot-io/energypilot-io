import { Device } from '@/entities/device.entity.js'
import { getEntityManager } from './database-manager.js'
import { ChildLogger, getLogger } from './log-manager.js'
import { IInterface } from '@/interfaces/interface.js'
import {
    RegisteredDeviceClasses,
    RegisteredInterfaceClasses,
} from './config.js'
import { DeviceBase, DeviceDefinition } from '@/devices/device-base.js'
import { BatteryDevice } from '@/devices/battery-device.js'
import { ConsumerDevice } from '@/devices/consumer-device.js'
import { PVDevice } from '@/devices/pv-device.js'
import { GridDevice } from '@/devices/grid-device.js'

let _logger: ChildLogger

const _interfaceInstances: { [key: string]: IInterface } = {}
const _deviceInstances: { [key: string]: DeviceBase } = {}

type DeviceClass = {
    new (
        interfaceInstance: IInterface,
        deviceDefinition: Device,
        latestValues: Map<string, number>
    ): DeviceBase
    getDeviceDefinition(): DeviceDefinition
}

let _deviceRegistrySchema: object = {}

/**
 * Latest value per device and value name, as a single grouped query.
 *
 * This relies on a documented SQLite guarantee: in a query with exactly one
 * `max()` aggregate, the bare columns are taken from the row that produced the
 * maximum. So one index scan yields the newest `value` for every
 * (device, name) pair.
 *
 * The obvious alternative — loading a device's values ordered by date and
 * keeping the first of each name — reads that device's entire history to
 * recover a handful of numbers, and hydrates every row into a managed entity.
 */
async function findLatestValuesByDevice(): Promise<
    Map<number, Map<string, number>>
> {
    const rows = await getEntityManager()
        .getConnection()
        .execute<{ device_id: number; name: string; value: number }[]>(
            'select device_id, name, value, max(snapshot_id) from device_value group by device_id, name'
        )

    const result = new Map<number, Map<string, number>>()

    for (const row of rows) {
        if (!result.has(row.device_id)) {
            result.set(row.device_id, new Map())
        }
        result.get(row.device_id)!.set(row.name, row.value)
    }

    return result
}

export async function initDeviceManager() {
    _logger = getLogger('device-manager')

    buildDeviceRegistrySchema()

    const em = getEntityManager()

    const devices = (await em.findAll(Device)).filter(device => device.id! >= 0)
    const latestValuesByDevice = await findLatestValuesByDevice()

    for (const device of devices) {
        _logger.info(`Loaded device [${device.name}] from database`)

        createDevice(
            device,
            latestValuesByDevice.get(device.id!) ?? new Map<string, number>()
        )
    }
}

export function getDeviceRegistrySchema(): object {
    return _deviceRegistrySchema
}

function buildDeviceRegistrySchema() {
    const groupedDeviceClasses: { [type: string]: (typeof DeviceBase)[] } = {}

    for (const deviceClass of RegisteredDeviceClasses) {
        const deviceDefinition: DeviceDefinition =
            deviceClass.getDeviceDefinition()

        for (const deviceType of deviceDefinition.types) {
            if (!(deviceType in groupedDeviceClasses)) {
                groupedDeviceClasses[deviceType] = []
            }

            groupedDeviceClasses[deviceType].push(deviceClass)
        }
    }

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
                enum: [...Object.keys(groupedDeviceClasses).sort()],
            },
        },

        required: ['device_name', 'device_type'],

        dependencies: {
            device_type: {
                oneOf: Object.keys(groupedDeviceClasses).map(type => ({
                    properties: {
                        device_type: {
                            enum: [type],
                        },

                        device_model: buildDevicePropertiesSchemaForType(
                            type,
                            groupedDeviceClasses[type]
                        ),
                    },
                })),
            },
        },
    }
}

function getCustomDevicePropertiesSchemaForType(type: string) {
    switch (type) {
        case BatteryDevice.DEVICE_TYPE:
            return BatteryDevice.getBatteryPropertiesSchema()

        case ConsumerDevice.DEVICE_TYPE:
            return ConsumerDevice.getConsumerPropertiesSchema()

        case PVDevice.DEVICE_TYPE:
            return PVDevice.getPVPropertiesSchema()

        case GridDevice.DEVICE_TYPE:
            return GridDevice.getGridPropertiesSchema()

        default:
            return {}
    }
}

function buildDevicePropertiesSchemaForType(
    type: string,
    deviceClasses: (typeof DeviceBase)[]
) {
    return {
        type: 'object',
        properties: {
            device_model: {
                type: 'string',
                title: '{{ device.interfaces.deviceModel }}',
                enum: deviceClasses
                    .map(deviceClass => deviceClass.getDeviceDefinition().model)
                    .sort(),
            },
        },

        required: ['device_model'],

        dependencies: {
            device_model: {
                oneOf: deviceClasses.map(deviceClass => {
                    const deviceDefinition: DeviceDefinition =
                        deviceClass.getDeviceDefinition()

                    return {
                        properties: {
                            device_model: {
                                enum: [deviceDefinition.model],
                            },

                            custom_properties:
                                getCustomDevicePropertiesSchemaForType(type),

                            interface: buildSchemaForInterfaces(
                                deviceDefinition.interfaces
                            ),
                        },
                    }
                }),
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

export async function createDevice(
    deviceDefinition: Device,
    latestValues: Map<string, number>
) {
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
        deviceDefinition,
        latestValues
    )
    return _deviceInstances[deviceDefinition.name]
}

export function removeDevice(deviceName: string) {
    if (
        deviceName in _deviceInstances &&
        _deviceInstances[deviceName].deviceDefinition.id! >= 0
    ) {
        delete _deviceInstances[deviceName]
    }
}

export function resetAllDeviceCaches() {
    Object.keys(_interfaceInstances).forEach(interfaceKey => {
        _interfaceInstances[interfaceKey].resetCache()
    })
}

export async function setDeviceStatus(
    deviceName: string,
    isEnabled: boolean
): Promise<boolean> {
    if (
        deviceName in _deviceInstances &&
        _deviceInstances[deviceName].deviceDefinition.is_enabled !== isEnabled
    ) {
        _deviceInstances[deviceName].deviceDefinition.is_enabled = isEnabled
        await getEntityManager().upsert(
            _deviceInstances[deviceName].deviceDefinition
        )

        return true
    }

    return false
}

export function getDeviceInstances() {
    return _deviceInstances
}
