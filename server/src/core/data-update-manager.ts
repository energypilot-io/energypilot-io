import { GridDevice } from '@/devices/grid'
import { getDeviceInstances, resetAllDeviceCaches } from './device-manager'
import { ChildLogger, getLogger } from './logmanager'
import { PVDevice } from '@/devices/pv'
import { BatteryDevice } from '@/devices/battery'
import { ConsumerDevice } from '@/devices/consumer'
import { Snapshot } from '@/entities/snapshot.entity'
import { persistEntity } from './database'
import { DeviceValue } from '@/entities/device.value.entity'
import { emitWebsocketEvent } from './webserver'
import { WS_EVENT_SNAPSHOT_NEW, WS_EVENT_DEVICE_UPDATE } from '@/constants'
import { Semaphore } from '@/libs/semaphore'

let _pollDataIntervalObject: NodeJS.Timeout
let _persistSnapshotIntervalObject: NodeJS.Timeout

let _logger: ChildLogger

let _deviceValuesPersistanceCache: { [deviceName: string]: DeviceValue[][] } =
    {}

const _deviceValueCacheResource = new Semaphore(
    'deviceValuesPersistanceCache',
    1
)

export async function initDataUpdateManager() {
    _logger = getLogger('dataupdate')

    _pollDataIntervalObject = setInterval(pollData, 10 * 1000) // every 60 seconds
    _persistSnapshotIntervalObject = setInterval(persistSnapshot, 60 * 1000) // every 60 seconds

    process.on('exit', () => {
        clearInterval(_pollDataIntervalObject)
        clearInterval(_persistSnapshotIntervalObject)
    })
}

async function persistSnapshot() {
    const lock = await _deviceValueCacheResource.acquire()

    const deviceValues: DeviceValue[] = []

    Object.values(_deviceValuesPersistanceCache).map((deviceValuesArrays) => {
        const valuesByType: { [name: string]: number[] } = {}

        deviceValuesArrays.forEach((deviceValues) => {
            deviceValues.forEach((deviceValue) => {
                if (!(deviceValue.name in valuesByType)) {
                    valuesByType[deviceValue.name] = []
                }
                valuesByType[deviceValue.name].push(deviceValue.value)
            })
        })

        Object.keys(valuesByType).forEach((valueName) => {
            const values = valuesByType[valueName]
            const averageValue =
                values.reduce((a, b) => a + b, 0) / values.length

            deviceValues.push(
                new DeviceValue({
                    device: deviceValuesArrays[0][0].device,
                    name: valueName,
                    value: averageValue,
                })
            )
        })
    })

    _deviceValuesPersistanceCache = {}
    lock.release()

    if (deviceValues.length === 0) {
        _logger.debug(
            'No device values collected, skipping snapshot persistence'
        )
        return
    }

    const snapshot = new Snapshot()
    snapshot.created_at = new Date()
    snapshot.device_snapshots.add(deviceValues)

    await persistEntity(snapshot)
}

async function pollData() {
    resetAllDeviceCaches()

    _logger.debug('Polling live data from devices')

    const deviceInstances = getDeviceInstances()
    const deviceValuesCache: DeviceValue[] = []

    for (let key in deviceInstances) {
        const deviceInstance = deviceInstances[key]
        const isEnabled = deviceInstance.deviceDefinition.is_enabled

        if (!isEnabled) continue

        const deviceValues: DeviceValue[] = []

        if (deviceInstance instanceof GridDevice) {
            const power = await deviceInstance.getPowerValue()
            const energyImport = await deviceInstance.getEnergyImportValue()
            const energyExport = await deviceInstance.getEnergyExportValue()

            if (
                power !== undefined &&
                energyImport !== undefined &&
                energyExport !== undefined
            ) {
                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy_import',
                        value: energyImport,
                    })
                )

                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy_export',
                        value: energyExport,
                    })
                )

                deviceInstance.deviceDefinition.connected = true
            } else {
                deviceInstance.deviceDefinition.connected = false
            }

            _logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy Import: ${energyImport} kWh, Energy Export: ${energyExport} kWh`
            )
        } else if (deviceInstance instanceof PVDevice) {
            const power = await deviceInstance.getPowerValue()
            const energy = await deviceInstance.getEnergyValue()

            if (power !== undefined && energy !== undefined) {
                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy',
                        value: energy,
                    })
                )

                deviceInstance.deviceDefinition.connected = true
            } else {
                deviceInstance.deviceDefinition.connected = false
            }

            _logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy: ${energy} kWh`
            )
        } else if (deviceInstance instanceof BatteryDevice) {
            const soc = await deviceInstance.getSoCValue()
            const power = await deviceInstance.getPowerValue()

            if (power !== undefined && soc !== undefined) {
                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'soc',
                        value: soc,
                    })
                )

                deviceInstance.deviceDefinition.connected = true
            } else {
                deviceInstance.deviceDefinition.connected = false
            }

            _logger.debug(
                deviceInstance.deviceDefinition.name,
                `SoC: ${soc} %, Power: ${power} W`
            )
        } else if (deviceInstance instanceof ConsumerDevice) {
            const power = await deviceInstance.getPowerValue()
            const energy = await deviceInstance.getEnergyValue()

            if (power !== undefined && energy !== undefined) {
                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                deviceValues.push(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy',
                        value: energy,
                    })
                )

                deviceInstance.deviceDefinition.connected = true
            } else {
                deviceInstance.deviceDefinition.connected = false
            }

            _logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy: ${energy} kWh`
            )
        }

        const lock = await _deviceValueCacheResource.acquire()
        if (deviceValues.length > 0) {
            if (
                !_deviceValuesPersistanceCache[
                    deviceInstance.deviceDefinition.name
                ]
            ) {
                _deviceValuesPersistanceCache[
                    deviceInstance.deviceDefinition.name
                ] = []
            }
            _deviceValuesPersistanceCache[
                deviceInstance.deviceDefinition.name
            ].push(deviceValues)

            deviceValuesCache.push(...deviceValues)
        }
        lock.release()
    }

    emitWebsocketEvent(
        WS_EVENT_SNAPSHOT_NEW,
        JSON.stringify({
            created_at: new Date(),
            device_snapshots: deviceValuesCache.map(
                (deviceValue: DeviceValue) => {
                    return {
                        device_id: deviceValue.device.id,
                        device_name: deviceValue.device.name,
                        device_type: deviceValue.device.type,
                        name: deviceValue.name,
                        value: deviceValue.value,
                    }
                }
            ),
        })
    )

    emitWebsocketEvent(
        WS_EVENT_DEVICE_UPDATE,
        JSON.stringify(
            Object.values(deviceInstances).map((deviceInstance) => {
                return {
                    id: deviceInstance.deviceDefinition.id,
                    name: deviceInstance.deviceDefinition.name,
                    is_enabled: deviceInstance.deviceDefinition.is_enabled,
                    type: deviceInstance.deviceDefinition.type,
                    model: deviceInstance.deviceDefinition.model,
                    interface: deviceInstance.deviceDefinition.interface,
                    properties: deviceInstance.deviceDefinition.properties,
                    connected: deviceInstance.deviceDefinition.connected,
                }
            })
        )
    )
}
