import { Device } from 'server/database/entities/device.entity'
import { IInterface, InterfaceDef } from 'server/interfaces/IInterface'
import { ModbusInterface } from 'server/interfaces/modbus'
import { TPLinkTapoConnector } from 'server/interfaces/tplink-tapo'
import { GridDevice } from 'server/devices/grid'
import { BaseDevice } from 'server/devices/base-device'
import { PVDevice } from 'server/devices/pv'
import { BatteryDevice } from 'server/devices/battery'
import { ConsumerDevice } from 'server/devices/consumer'
import { getLogger } from './logmanager'
import { getTemplateForType } from './template-engine'

const _interfaceClasses: { [id: string]: any } = {
    modbus: ModbusInterface,
    tapo: TPLinkTapoConnector,
}

const _deviceClasses: { [id: string]: any } = {
    grid: GridDevice,
    pv: PVDevice,
    battery: BatteryDevice,
    consumer: ConsumerDevice,
}

const _interfaceInstances: { [key: string]: IInterface } = {}
const _deviceInstances: { [key: string]: BaseDevice } = {}

function createInterface(interfaceName: string, properties: string) {
    if (!(interfaceName + properties in _interfaceInstances)) {
        if (!(interfaceName in _interfaceClasses)) {
            getLogger('devices').error(
                `No class found for interface [${interfaceName}]`
            )
        } else {
            _interfaceInstances[interfaceName + properties] =
                new _interfaceClasses[interfaceName](JSON.parse(properties))
        }
    }

    return _interfaceInstances[interfaceName + properties]
}

export function getInterfaceDefs(): {
    [interfaceName: string]: InterfaceDef
} {
    return Object.assign(
        {},
        ...Object.keys(_interfaceClasses).map((interfaceName) => ({
            [interfaceName]: _interfaceClasses[interfaceName].getInterfaceDef(),
        }))
    )
}

export function getInterfaceTranslations(): {
    [lang: string]: { [namespace: string]: any }
} {
    const translations: {
        [lang: string]: { [namespace: string]: any }
    } = {}

    Object.keys(_interfaceClasses).forEach((interfaceName) => {
        const interfaceTranslations =
            _interfaceClasses[interfaceName].getTranslations()

        Object.keys(interfaceTranslations).forEach((lang) => {
            if (!(lang in translations)) translations[lang] = {}

            translations[lang][interfaceName] = interfaceTranslations[lang]
        })
    })

    return translations
}

export function resetAllDeviceCaches() {
    Object.keys(_interfaceInstances).forEach((interfaceKey) => {
        _interfaceInstances[interfaceKey].resetCache()
    })
}

export function getDeviceInstances() {
    return _deviceInstances
}

export function createDevice(deviceDefinition: Device) {
    const interfaceInstance = createInterface(
        deviceDefinition.interface,
        deviceDefinition.properties
    )

    const logger = getLogger('devices')

    if (interfaceInstance === undefined) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: not able to create interface instance.`
        )
        return undefined
    }

    const template = getTemplateForType(
        deviceDefinition.type,
        deviceDefinition.template
    )

    if (interfaceInstance === undefined) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: not able to find template [${deviceDefinition.type}/${deviceDefinition.template}].`
        )
        return undefined
    }

    if (deviceDefinition.name in _deviceInstances) {
        logger.error(
            `Cannot create device with name [${deviceDefinition.name}]: A device with the name already exists.`
        )
        return undefined
    } else {
        _deviceInstances[deviceDefinition.name] = new _deviceClasses[
            deviceDefinition.type
        ](interfaceInstance, template, deviceDefinition)
    }

    return _deviceInstances[deviceDefinition.name]
}

export function removeDevice(deviceName: string) {
    if (deviceName in _deviceInstances) {
        delete _deviceInstances[deviceName]
    } else {
        getLogger('devices').error(
            `Cannot remove device with name [${deviceName}]: No instance with that name found`
        )
    }
}

export function refreshDevice(deviceDefinition: Device) {
    if (deviceDefinition.name in _deviceInstances) {
        const deviceInstance = _deviceInstances[deviceDefinition.name]
        deviceInstance.deviceDefinition = deviceDefinition
    } else {
        getLogger('devices').error(
            `Cannot refresh device with name [${deviceDefinition.name}]: No instance with that name found`
        )
    }
}
