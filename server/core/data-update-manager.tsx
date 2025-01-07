import { UpdateDef } from 'server/defs/configuration'
import { logging } from './log-manager'
import { GridDevice } from 'server/devices/grid'
import { database } from './database-manager'
import { PVDevice } from 'server/devices/pv'
import { BatteryDevice } from 'server/devices/battery'
import { websockets } from './websockets-manager'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import { ConsumerDevice } from 'server/devices/consumer'
import { Snapshot } from 'server/database/entities/snapshot.entity'
import { devices } from './device-manager'
import { DeviceSnapshot } from 'server/database/entities/device-snapshot.entity'

var _logger: logging.ChildLogger

export namespace dataupdate {
    let _snapshots = []

    export function initDataUpdate(updateDef: Partial<UpdateDef> | undefined) {
        _logger = logging.getLogger('dataupdate')

        const pollingInterval = setInterval(
            refreshValues,
            (updateDef?.polling ?? 5) * 1000
        )
        process.on('exit', (code) => {
            clearInterval(pollingInterval)
        })
    }

    async function refreshValues() {
        // let totalGridPower = 0
        // let totalPVPower = 0

        // let totalConsumerPower = 0

        // let batteryChargePower = 0
        // let batteryDischargePower = 0

        // const snapshot: Snapshot = new Snapshot()
        // snapshot.createdAt = new Date()
        // await database.persistEntity(snapshot)

        const snapshot: DeviceSnapshot[] = []

        for (let key in devices.instances) {
            const device = devices.instances[key]

            if (device instanceof GridDevice) {
                const gridPowerValue = await device.getPowerValue()
                const gridEnergyValue = await device.getEnergyValue()

                if (
                    gridPowerValue !== undefined ||
                    gridEnergyValue !== undefined
                ) {
                    snapshot.push(
                        new DeviceSnapshot({
                            type: 'grid',
                            device_id: device.id,
                            label: device.label,
                            power: gridPowerValue,
                            energy: gridEnergyValue,
                        })
                    )
                }
            } else if (device instanceof PVDevice) {
                const pvPowerValue = await device.getPowerValue()
                const pvEnergyValue = await device.getEnergyValue()

                if (pvPowerValue !== undefined || pvEnergyValue !== undefined) {
                    snapshot.push(
                        new DeviceSnapshot({
                            type: 'pv',
                            device_id: device.id,
                            label: device.label,
                            power: pvPowerValue,
                            energy: pvEnergyValue,
                        })
                    )
                }
            } else if (device instanceof BatteryDevice) {
                const socValue = await device.getSoCValue()
                const batteryPowerValue = await device.getPowerValue()

                if (socValue !== undefined || batteryPowerValue !== undefined) {
                    snapshot.push(
                        new DeviceSnapshot({
                            type: 'battery',
                            device_id: device.id,
                            label: device.label,
                            soc: socValue,
                            power: batteryPowerValue,
                        })
                    )
                }
            } else if (device instanceof ConsumerDevice) {
                const consumerPowerValue = await device.getPowerValue()
                const consumerEnergyValue = await device.getEnergyValue()

                if (
                    consumerPowerValue !== undefined ||
                    consumerEnergyValue !== undefined
                ) {
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
        }

        // const consumption = Math.round(
        //     totalGridPower +
        //         totalPVPower +
        //         (batteryDischargePower !== null &&
        //         batteryDischargePower !== undefined
        //             ? batteryDischargePower
        //             : 0) -
        //         (batteryChargePower !== null && batteryChargePower !== undefined
        //             ? batteryChargePower
        //             : 0)
        // )

        // const energy = new Energy()
        // energy.grid_power = totalGridPower
        // energy.pv_power = Math.round(totalPVPower)
        // energy.battery_soc = batterySoC!
        // energy.battery_charge_power = batteryChargePower!
        // energy.battery_discharge_power = batteryDischargePower!
        // energy.consumption = consumption
        // energy.source = 'EnergyPilot.io'

        // database.persistEntity(energy, () => {
        //     websockets.emitEvent(WS_EVENT_LIVEDATA_UPDATED)
        // })

        emitSnapshotEvent(snapshot)
        _snapshots.push(snapshot)
    }

    function emitSnapshotEvent(snapshot: any[]) {
        websockets.emitEvent(WS_EVENT_LIVEDATA_UPDATED, snapshot)
    }
}
