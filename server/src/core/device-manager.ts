import { Device } from '@/entities/device.entity'
import { getEntityManager } from './database'
import { ChildLogger, getLogger } from './logmanager'
import { IInterface } from '@/interfaces/interface'
import { RegisteredDeviceClasses, RegisteredInterfaceClasses } from './config'
import { getTemplateForModel } from './template-engine'
import { BaseDevice } from '@/devices/base-device'

let _logger: ChildLogger

const _interfaceInstances: { [key: string]: IInterface } = {}
const _deviceInstances: { [key: string]: BaseDevice } = {}

export async function initDeviceManager() {
    _logger = getLogger('device-manager')

    getEntityManager()
        .findAll(Device)
        .then((devices) => {
            devices.forEach((device) => {
                _logger.info(`Loaded device [${device.name}] from database`)

                createDevice(device)
            })
        })
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

    const template = getTemplateForModel(
        deviceDefinition.type,
        deviceDefinition.model
    )

    if (template === undefined) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: not able to find template for model [${deviceDefinition.type}/${deviceDefinition.model}].`
        )
        return undefined
    }

    if (!(deviceDefinition.type in RegisteredDeviceClasses)) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: No class found for device type [${deviceDefinition.type}].`
        )
        return undefined
    }

    _deviceInstances[deviceDefinition.name] = new RegisteredDeviceClasses[
        deviceDefinition.type
    ](interfaceInstance, template, deviceDefinition)
    return _deviceInstances[deviceDefinition.name]
}

export function removeDevice(deviceName: string) {
    if (deviceName in _deviceInstances) {
        delete _deviceInstances[deviceName]
    }
}

export function resetAllDeviceCaches() {
    Object.keys(_interfaceInstances).forEach((interfaceKey) => {
        _interfaceInstances[interfaceKey].resetCache()
    })
}

export function getDeviceInstances() {
    return _deviceInstances
}
