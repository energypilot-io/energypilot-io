import { GridDevice } from 'server/devices/grid'
import { database } from './database-manager'
import { PVDevice } from 'server/devices/pv'
import { BatteryDevice } from 'server/devices/battery'
import { websockets } from './websockets-manager'
import {
    WS_EVENT_LIVEDATA_UPDATED,
    WS_EVENT_SNAPSHOT_CREATED,
} from 'server/constants'
import { ConsumerDevice } from 'server/devices/consumer'
import { Snapshot } from 'server/database/entities/snapshot.entity'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'

import Semaphore from 'ts-semaphore'
import { devices } from './devices'
import { settings } from './settings'
import { Setting } from 'server/database/entities/setting.entity'
import { registerSettingObserver } from 'server/database/subscribers/setting-subscriber'
import { getLogger } from './logmanager'

export namespace dataupdate {
    let _latestSnapshot: DeviceSnapshot[] = []

    let _pollDataInterval: NodeJS.Timeout
    let _createSnapshotInterval: NodeJS.Timeout

    const _settingKeyPollInterval: string = 'data_poll_interval'
    const _settingKeySnapshotInterval: string = 'data_snapshot_interval'

    const semaphore = new Semaphore(1)

    export async function initDataUpdate() {
        settings.registerSettings({
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
            (await settings.getNumber(_settingKeyPollInterval))! * 1000
        )

        _createSnapshotInterval = setInterval(
            createSnapshot,
            (await settings.getNumber(_settingKeySnapshotInterval))! * 1000
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

        _pollDataInterval = setInterval(
            pollData,
            Number.parseFloat(value) * 1000
        )
    }

    async function pollData() {
        devices.resetAllCaches()

        const logger = getLogger('dataupdate')

        logger.debug('Collecting live data from devices')

        const snapshot: DeviceSnapshot[] = []
        const deviceInstances = devices.getAllInstances()

        for (let key in deviceInstances) {
            const device = deviceInstances[key]
            const isEnabled = await device.isEnabled()

            if (device instanceof GridDevice) {
                const gridPowerValue = isEnabled
                    ? await device.getPowerValue()
                    : 0
                const gridEnergyImportValue = isEnabled
                    ? await device.getEnergyImportValue()
                    : 0
                const gridEnergyExportValue = isEnabled
                    ? await device.getEnergyExportValue()
                    : 0

                snapshot.push(
                    new DeviceSnapshot({
                        type: 'grid',
                        device_name: device.name,
                        power: gridPowerValue,
                        energy_import: gridEnergyImportValue,
                        energy_export: gridEnergyExportValue,
                    })
                )
            } else if (device instanceof PVDevice) {
                const pvPowerValue = isEnabled
                    ? await device.getPowerValue()
                    : 0
                const pvEnergyValue = isEnabled
                    ? await device.getEnergyValue()
                    : 0

                snapshot.push(
                    new DeviceSnapshot({
                        type: 'pv',
                        device_name: device.name,
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
                        device_name: device.name,
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
                        device_name: device.name,
                        power: consumerPowerValue,
                        energy: consumerEnergyValue,
                    })
                )
            }
        }

        websockets.emitEvent(WS_EVENT_LIVEDATA_UPDATED, snapshot)
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

            await database.persistEntity(snapshot)

            websockets.emitEvent(WS_EVENT_SNAPSHOT_CREATED)
        })
    }
}
