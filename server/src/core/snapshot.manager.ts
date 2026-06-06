import { getDeviceInstances, resetAllDeviceCaches } from './device.manager.js'
import { ChildLogger, getLogger } from './log.manager.js'
import { Snapshot } from '@/entities/snapshot.entity.js'
import { getEntityManager, persistEntity } from './database.manager.js'
import { DeviceValue } from '@/entities/device.value.entity.js'
import { WS_EVENT_SNAPSHOT_NEW, WS_EVENT_DEVICE_UPDATE } from '@/constants.js'
import { Semaphore } from '@/libs/semaphore.js'
import { BatteryDevice } from '@/devices/battery.device.js'
import { GridDevice } from '@/devices/grid.device.js'
import { PVDevice } from '@/devices/pv.device.js'
import { ConsumerDevice } from '@/devices/consumer.device.js'
import {
    MIN_POLLING_RATE,
    MIN_SNAPSHOT_PERSISTANCE_INTERVAL,
    registerSettingChangeObserver,
    SETTING_POLLING_RATE,
    SETTING_SNAPSHOT_PERSISTANCE_INTERVAL,
} from './setting.manager.js'
import { sendEvent } from './event.manager.js'
import { VirtualDeviceHome } from '@/seeder/device.seeder.js'
import { SettingChangeObserver } from '@/observers/setting-change.observer.js'
import { toISOStringWithTimezone } from '@/libs/utils.js'
import { SnapshotGroupedHourlyView } from '@/entities/snapshot.grouped.hourly.view.entity.js'
import { SnapshotGroupedDailyView } from '@/entities/snapshot.grouped.daily.view.entity.js'

let _pollDataIntervalObject: NodeJS.Timeout
let _persistSnapshotIntervalObject: NodeJS.Timeout

let _logger: ChildLogger

let _deviceValuesPersistanceCache: { [deviceName: string]: DeviceValue[][] } =
    {}

let _lastLiveData: any = null

let _pollInterval: number = 10 * 1000
let _snapshotPersistInterval: number = 60 * 1000

const _deviceValueCacheResource = new Semaphore(
    'deviceValuesPersistanceCache',
    1
)

class SnapshotManagerSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [SETTING_POLLING_RATE, SETTING_SNAPSHOT_PERSISTANCE_INTERVAL]
    }

    onSettingChange(name: string, value?: any): boolean {
        if (!value) return false

        if (name === SETTING_POLLING_RATE) {
            _pollInterval = Math.max(MIN_POLLING_RATE, parseInt(value)) * 1000
            createPollingInterval()

            return true
        } else if (name === SETTING_SNAPSHOT_PERSISTANCE_INTERVAL) {
            _snapshotPersistInterval =
                Math.max(MIN_SNAPSHOT_PERSISTANCE_INTERVAL, parseInt(value)) *
                1000
            createSnapshotPersistInterval()

            return true
        }

        return false
    }
}

export async function initSnapshotManager() {
    _logger = getLogger('snapshot')

    await registerSettingChangeObserver(
        new SnapshotManagerSettingChangeObserver()
    )

    createPollingInterval()
    createSnapshotPersistInterval()

    _logger.info('Snapshot manager initialized')

    process.on('exit', () => {
        clearInterval(_pollDataIntervalObject)
        clearInterval(_persistSnapshotIntervalObject)
    })
}

export function getLastLiveData(): any {
    return _lastLiveData
}

export async function findSnapshotsBetweenDates(params: {
    startDate?: Date
    endDate?: Date
    limit?: number
    grouping?: string
}): Promise<object | undefined> {
    switch (params.grouping) {
        case 'hour': {
            const snapshots = await getEntityManager().find(
                SnapshotGroupedHourlyView,
                params.startDate && params.endDate
                    ? {
                          created_at: {
                              $gte: params.startDate,
                              $lte: params.endDate ?? new Date(),
                          },
                      }
                    : {},
                {
                    populate: ['*'],
                    orderBy: {
                        created_at: (params.limit ?? 0) < 0 ? 'DESC' : 'ASC',
                    },
                    limit: params.limit ? Math.abs(params.limit) : undefined,
                }
            )
            return snapshots
        }

        case 'day': {
            const snapshots = await getEntityManager().find(
                SnapshotGroupedDailyView,
                params.startDate && params.endDate
                    ? {
                          created_at: {
                              $gte: params.startDate,
                              $lte: params.endDate ?? new Date(),
                          },
                      }
                    : {},
                {
                    populate: ['*'],
                    orderBy: {
                        created_at: (params.limit ?? 0) < 0 ? 'DESC' : 'ASC',
                    },
                    limit: params.limit ? Math.abs(params.limit) : undefined,
                }
            )
            return snapshots
        }

        default: {
            const snapshots = await getEntityManager().find(
                Snapshot,
                params.startDate && params.endDate
                    ? {
                          created_at: {
                              $gte: params.startDate,
                              $lte: params.endDate ?? new Date(),
                          },
                      }
                    : {},
                {
                    populate: ['*'],
                    orderBy: {
                        created_at: (params.limit ?? 0) < 0 ? 'DESC' : 'ASC',
                    },
                    limit: params.limit ? Math.abs(params.limit) : undefined,
                }
            )

            return snapshots
        }
    }
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
        created_at: toISOStringWithTimezone(new Date()),
        device_snapshots: deviceValuesCache.map((deviceValue: DeviceValue) => {
            return {
                device_id: deviceValue.device.id,
                device_name: deviceValue.device.name,
                device_type: deviceValue.device.type,
                name: deviceValue.name,
                value: deviceValue.value,
                connected: deviceValue.device.connected,
                is_enabled: deviceValue.device.is_enabled,
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
