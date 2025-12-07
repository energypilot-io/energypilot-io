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
import { WS_EVENT_SNAPSHOT_NEW } from '@/constants'
import { Semaphore } from '@/libs/semaphore'

let _pollDataIntervalObject: NodeJS.Timeout
let _persistSnapshotIntervalObject: NodeJS.Timeout

let _logger: ChildLogger

let _deviceValuesCache: DeviceValue[] = []

const _deviceValueCacheResource = new Semaphore('deviceValuesCache', 1)

export async function initDataUpdateManager() {
    _logger = getLogger('dataupdate')

    _pollDataIntervalObject = setInterval(pollData, 10 * 1000) // every 60 seconds
    _persistSnapshotIntervalObject = setInterval(persistSnapshot, 60 * 1000) // every 60 seconds

    process.on('exit', () => {
        clearInterval(_pollDataIntervalObject)
        clearInterval(_persistSnapshotIntervalObject)
    })
}

export async function getLatestSnapshot() {
    const lock = await _deviceValueCacheResource.acquire()
    const deviceValues = [..._deviceValuesCache]
    lock.release()

    if (deviceValues.length === 0) {
        _logger.debug(
            'No device values collected, skipping snapshot persistence'
        )
        return undefined
    }

    const snapshot = new Snapshot()
    snapshot.created_at = new Date()
    snapshot.device_snapshots.add(deviceValues)

    return snapshot
}

async function persistSnapshot() {
    const snapshot = await getLatestSnapshot()

    if (snapshot) {
        await persistEntity(snapshot)
    }
}

async function pollData() {
    resetAllDeviceCaches()

    _logger.debug('Polling live data from devices')

    const deviceInstances = getDeviceInstances()

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
            }

            _logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy: ${energy} kWh`
            )
        }

        const lock = await _deviceValueCacheResource.acquire()
        if (deviceValues.length > 0) {
            _deviceValuesCache = [
                ..._deviceValuesCache.filter(
                    (value: DeviceValue) =>
                        value.device.id !== deviceInstance.deviceDefinition.id
                ),
            ]

            _deviceValuesCache.push(...deviceValues)
        }
        lock.release()
    }

    emitWebsocketEvent(
        WS_EVENT_SNAPSHOT_NEW,
        JSON.stringify({
            created_at: new Date(),
            device_snapshots: _deviceValuesCache.map(
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
}
