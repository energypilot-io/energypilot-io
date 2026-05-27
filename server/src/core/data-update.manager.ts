import { getDeviceInstances, resetAllDeviceCaches } from './device.manager'
import { ChildLogger, getLogger } from './log.manager'
import { Snapshot } from '@/entities/snapshot.entity'
import { persistEntity } from './database.manager'
import { DeviceValue } from '@/entities/device.value.entity'
import { WS_EVENT_SNAPSHOT_NEW, WS_EVENT_DEVICE_UPDATE } from '@/constants'
import { Semaphore } from '@/libs/semaphore'
import { BatteryDevice } from '@/devices/battery.device'
import { GridDevice } from '@/devices/grid.device'
import { PVDevice } from '@/devices/pv.device'
import { ConsumerDevice } from '@/devices/consumer.device'
import {
    MIN_POLLING_RATE,
    MIN_SNAPSHOT_PERSISTANCE_INTERVAL,
    registerSettingChangeObserver,
    SETTING_POLLING_RATE,
    SETTING_SNAPSHOT_PERSISTANCE_INTERVAL,
    SettingChangeObserver,
} from './setting.manager'
import { sendEvent } from './event.manager'
import { VirtualDeviceHome } from '@/seeder/device.seeder'

let _pollDataIntervalObject: NodeJS.Timeout
let _persistSnapshotIntervalObject: NodeJS.Timeout

let _logger: ChildLogger

let _deviceValuesPersistanceCache: { [deviceName: string]: DeviceValue[][] } =
    {}

let _lastLiveData: any = null

let _pollInterval: number
let _snapshotPersistInterval: number

const _deviceValueCacheResource = new Semaphore(
    'deviceValuesPersistanceCache',
    1
)

class UpdateManagerSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [SETTING_POLLING_RATE, SETTING_SNAPSHOT_PERSISTANCE_INTERVAL]
    }

    onSettingChange(name: string, value?: any): void {
        if (!value) return

        if (name === SETTING_POLLING_RATE) {
            _pollInterval = Math.max(MIN_POLLING_RATE, parseInt(value)) * 1000
            createPollingInterval()
        } else if (name === SETTING_SNAPSHOT_PERSISTANCE_INTERVAL) {
            _snapshotPersistInterval =
                Math.max(MIN_SNAPSHOT_PERSISTANCE_INTERVAL, parseInt(value)) *
                1000
            createSnapshotPersistInterval()
        }
    }
}

export async function initDataUpdateManager() {
    _logger = getLogger('dataupdate')

    await registerSettingChangeObserver(
        new UpdateManagerSettingChangeObserver()
    )

    _logger.info('Data update manager initialized')

    process.on('exit', () => {
        clearInterval(_pollDataIntervalObject)
        clearInterval(_persistSnapshotIntervalObject)
    })
}

export function getLastLiveData(): any {
    return _lastLiveData
}

function createPollingInterval() {
    if (_pollDataIntervalObject) {
        clearInterval(_pollDataIntervalObject)
    }

    _pollDataIntervalObject = setInterval(pollData, _pollInterval)

    _logger.info(`Polling interval set to ${_pollInterval} ms`)
}

function createSnapshotPersistInterval() {
    if (_persistSnapshotIntervalObject) {
        clearInterval(_persistSnapshotIntervalObject)
    }

    _persistSnapshotIntervalObject = setInterval(
        persistSnapshot,
        _snapshotPersistInterval
    )

    _logger.info(
        `Snapshot persistance interval set to ${_snapshotPersistInterval} ms`
    )
}

async function persistSnapshot() {
    const lock = await _deviceValueCacheResource.acquire()

    const deviceValues: DeviceValue[] = []

    Object.values(_deviceValuesPersistanceCache).map(deviceValuesArrays => {
        const valuesByType: { [name: string]: number[] } = {}

        deviceValuesArrays.forEach(deviceValues => {
            deviceValues.forEach(deviceValue => {
                if (!(deviceValue.name in valuesByType)) {
                    valuesByType[deviceValue.name] = []
                }
                valuesByType[deviceValue.name].push(deviceValue.value)
            })
        })

        Object.keys(valuesByType).forEach(valueName => {
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

    for (const key in deviceInstances) {
        const deviceInstance: any = deviceInstances[key]
        const isEnabled = deviceInstance.deviceDefinition.is_enabled

        if (!isEnabled) {
            deviceInstance.deviceDefinition.connected = false
            continue
        }

        const deviceValues: DeviceValue[] = []

        if (deviceInstance.deviceDefinition.type == GridDevice.DEVICE_TYPE) {
            const gridDeviceInstance = deviceInstance as GridDevice

            const power =
                await gridDeviceInstance.getGridPowerValue(_pollInterval)
            const energyImport =
                await gridDeviceInstance.getGridEnergyImportValue(_pollInterval)
            const energyExport =
                await gridDeviceInstance.getGridEnergyExportValue(_pollInterval)

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
        } else if (
            deviceInstance.deviceDefinition.type == BatteryDevice.DEVICE_TYPE
        ) {
            const batteryDeviceInstance = deviceInstance as BatteryDevice

            const soc =
                await batteryDeviceInstance.getBatterySoCValue(_pollInterval)
            const power =
                await batteryDeviceInstance.getBatteryPowerValue(_pollInterval)

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
        } else if (
            deviceInstance.deviceDefinition.type == PVDevice.DEVICE_TYPE
        ) {
            const pvDeviceInstance = deviceInstance as PVDevice

            const power = await pvDeviceInstance.getPVPowerValue(_pollInterval)
            const energy =
                await pvDeviceInstance.getPVEnergyValue(_pollInterval)

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
        } else if (
            deviceInstance.deviceDefinition.type == ConsumerDevice.DEVICE_TYPE
        ) {
            const consumerDeviceInstance = deviceInstance as ConsumerDevice

            const power =
                await consumerDeviceInstance.getConsumerPowerValue(
                    _pollInterval
                )
            const energy =
                await consumerDeviceInstance.getConsumerEnergyValue(
                    _pollInterval
                )

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

    const homeConsumptionDeviceValue = new DeviceValue({
        device: VirtualDeviceHome,
        name: 'power',
        value: deviceValuesCache.reduce(
            (acc: any, deviceValue: DeviceValue) => {
                if (
                    deviceValue.name === 'power' &&
                    deviceValue.value !== null &&
                    deviceValue.value !== undefined
                ) {
                    return acc - deviceValue.value
                }

                return acc
            },
            0
        ),
    })

    if (!_deviceValuesPersistanceCache[VirtualDeviceHome.name]) {
        _deviceValuesPersistanceCache[VirtualDeviceHome.name] = []
    }
    _deviceValuesPersistanceCache[VirtualDeviceHome.name].push([
        homeConsumptionDeviceValue,
    ])
    deviceValuesCache.push(homeConsumptionDeviceValue)

    _lastLiveData = {
        created_at: new Date(),
        device_snapshots: deviceValuesCache.map((deviceValue: DeviceValue) => {
            return {
                device_id: deviceValue.device.id,
                device_name: deviceValue.device.name,
                device_type: deviceValue.device.type,
                name: deviceValue.name,
                value: deviceValue.value,
            }
        }),
    }

    sendEvent(WS_EVENT_SNAPSHOT_NEW, JSON.stringify(_lastLiveData))

    sendEvent(
        WS_EVENT_DEVICE_UPDATE,
        JSON.stringify(
            Object.values(deviceInstances).map(deviceInstance => {
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
