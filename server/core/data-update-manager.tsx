import {
    WS_EVENT_LIVEDATA_UPDATED,
    WS_EVENT_SNAPSHOT_CREATED,
} from 'server/constants'
import { Snapshot } from 'server/database/entities/snapshot.entity'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'

import Semaphore from 'ts-semaphore'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'
import { getLogger } from './logmanager'
import { emitWebsocketEvent } from './webserver'
import {
    getSettingAsNumber as getSettingAsNumber,
    registerSettings,
} from './settings'
import { persistEntity } from './database'

import { GridDevice } from 'server/devices/grid'
import { PVDevice } from 'server/devices/pv'
import { BatteryDevice } from 'server/devices/battery'
import { ConsumerDevice } from 'server/devices/consumer'
import { getDeviceInstances, resetAllDeviceCaches } from './devices'

let _latestSnapshot: DeviceSnapshot[] = []

let _pollDataInterval: NodeJS.Timeout
let _createSnapshotInterval: NodeJS.Timeout

const _settingKeyPollInterval: string = 'data_poll_interval'
const _settingKeySnapshotInterval: string = 'data_snapshot_interval'

const semaphore = new Semaphore(1)

export async function initDataUpdate() {
    registerSettings({
        [_settingKeyPollInterval]: {
            type: 'number',
            defaultValue: 5,
            min: 1,
            max: 60,
            unit: 's',
        },

        [_settingKeySnapshotInterval]: {
            type: 'number',
            defaultValue: 60,
            min: 60,
            unit: 's',
        },
    })

    _pollDataInterval = setInterval(
        pollData,
        (await getSettingAsNumber(_settingKeyPollInterval))! * 1000
    )

    _createSnapshotInterval = setInterval(
        createSnapshot,
        (await getSettingAsNumber(_settingKeySnapshotInterval))! * 1000
    )

    process.on('exit', (code) => {
        clearInterval(_pollDataInterval)
        clearInterval(_createSnapshotInterval)
    })

    registerSettingObserver(_settingKeyPollInterval, onChangePollInterval)
    registerSettingObserver(
        _settingKeySnapshotInterval,
        onChangeSnapshotInterval
    )
}

function onChangeSnapshotInterval(value: string) {
    if (_createSnapshotInterval !== undefined)
        clearInterval(_createSnapshotInterval)

    _createSnapshotInterval = setInterval(
        createSnapshot,
        Number.parseFloat(value) * 1000
    )
}

function onChangePollInterval(value: string) {
    if (_pollDataInterval !== undefined) clearInterval(_pollDataInterval)

    _pollDataInterval = setInterval(pollData, Number.parseFloat(value) * 1000)
}

async function pollData() {
    resetAllDeviceCaches()

    const logger = getLogger('dataupdate')

    logger.debug('Collecting live data from devices')

    const snapshot: DeviceSnapshot[] = []
    const deviceInstances = getDeviceInstances()

    for (let key in deviceInstances) {
        const device = deviceInstances[key]
        const isEnabled = await device.isEnabled()

        if (device instanceof GridDevice) {
            const gridPowerValue = isEnabled ? await device.getPowerValue() : 0
            const gridEnergyImportValue = isEnabled
                ? await device.getEnergyImportValue()
                : 0
            const gridEnergyExportValue = isEnabled
                ? await device.getEnergyExportValue()
                : 0

            snapshot.push(
                new DeviceSnapshot({
                    type: 'grid',
                    device: device.deviceDefinition,
                    power: gridPowerValue,
                    energy_import: gridEnergyImportValue,
                    energy_export: gridEnergyExportValue,
                })
            )
        } else if (device instanceof PVDevice) {
            const pvPowerValue = isEnabled ? await device.getPowerValue() : 0
            const pvEnergyValue = isEnabled ? await device.getEnergyValue() : 0

            snapshot.push(
                new DeviceSnapshot({
                    type: 'pv',
                    device: device.deviceDefinition,
                    power: pvPowerValue,
                    energy: pvEnergyValue,
                })
            )
        } else if (device instanceof BatteryDevice) {
            const socValue = isEnabled ? await device.getSoCValue() : 0
            const batteryPowerValue = isEnabled
                ? await device.getPowerValue()
                : 0

            snapshot.push(
                new DeviceSnapshot({
                    type: 'battery',
                    device: device.deviceDefinition,
                    soc: socValue,
                    power: batteryPowerValue,
                })
            )
        } else if (device instanceof ConsumerDevice) {
            const consumerPowerValue = isEnabled
                ? await device.getPowerValue()
                : 0
            const consumerEnergyValue = isEnabled
                ? await device.getEnergyValue()
                : 0

            snapshot.push(
                new DeviceSnapshot({
                    type: 'consumer',
                    device: device.deviceDefinition,
                    power: consumerPowerValue,
                    energy: consumerEnergyValue,
                })
            )
        }
    }

    emitWebsocketEvent(WS_EVENT_LIVEDATA_UPDATED, snapshot)
    semaphore.use(async () => (_latestSnapshot = snapshot))
}

async function createSnapshot() {
    semaphore.use(async () => {
        const logger = getLogger('dataupdate')

        logger.log('Persisting data snapshot to database')

        const snapshot = new Snapshot()
        snapshot.created_at = new Date()

        _latestSnapshot.forEach(async (deviceSnapshot: DeviceSnapshot) => {
            deviceSnapshot.created_at = snapshot.created_at
            snapshot.device_snapshots.add(deviceSnapshot)
        })

        await persistEntity(snapshot)

        emitWebsocketEvent(WS_EVENT_SNAPSHOT_CREATED)
    })
}
