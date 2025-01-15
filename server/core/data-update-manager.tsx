import { UpdateDef } from 'server/defs/configuration'
import { logging } from './log-manager'
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
import { devices } from './device-manager'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'

import Semaphore from 'ts-semaphore'
import { connectors } from './connector-manager'

var _logger: logging.ChildLogger

export namespace dataupdate {
    let _latestSnapshot: DeviceSnapshot[] = []

    const semaphore = new Semaphore(1)

    export function initDataUpdate(updateDef: Partial<UpdateDef> | undefined) {
        _logger = logging.getLogger('dataupdate')

        const pollDataInterval = setInterval(
            pollData,
            (updateDef?.polling ?? 5) * 1000
        )

        const createSnapshotInterval = setInterval(
            createSnapshot,
            (updateDef?.snapshot ?? 60) * 1000
        )

        process.on('exit', (code) => {
            clearInterval(pollDataInterval)
            clearInterval(createSnapshotInterval)
        })
    }

    async function pollData() {
        connectors.resetAllCaches()

        _logger.debug('Collecting live data from devices')

        const snapshot: DeviceSnapshot[] = []

        for (let key in devices.instances) {
            const device = devices.instances[key]
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
                        device_id: device.id,
                        label: device.label,
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
                        device_id: device.id,
                        label: device.label,
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
                        device_id: device.id,
                        label: device.label,
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
                        device_id: device.id,
                        label: device.label,
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
            _logger.info('Persisting data snapshot to database')

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
