import { UpdateDef } from 'server/defs/configuration'
import { logging } from './log-manager'
import { GridDevice } from 'server/devices/grid'
import { GridSnapshot } from 'server/database/entities/grid-snapshot.entity'
import { database } from './database-manager'
import { PVDevice } from 'server/devices/pv'
import { PvSnapshot } from 'server/database/entities/pv-snapshot.entity'
import { BatteryDevice } from 'server/devices/battery'
import { websockets } from './websockets-manager'
import { WS_EVENT_LIVEDATA_UPDATED } from 'server/constants'
import { ConsumerDevice } from 'server/devices/consumer'
import { Snapshot } from 'server/database/entities/snapshot.entity'
import { BatterySnapshot } from 'server/database/entities/battery-snapshot.entity'
import { ConsumerSnapshot } from 'server/database/entities/consumer-snapshot.entity'
import { devices } from './device-manager'

var _logger: logging.ChildLogger

export namespace dataupdate {
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

        const snapshot: Snapshot = new Snapshot()
        snapshot.createdAt = new Date()
        await database.persistEntity(snapshot)

        for (let key in devices.instances) {
            const device = devices.instances[key]

            if (device instanceof GridDevice) {
                const gridPowerValue = await device.getPowerValue()
                const gridEnergyValue = await device.getEnergyValue()

                // if (gridPowerValue !== undefined) {
                //     totalGridPower += gridPowerValue
                // }

                if (
                    gridPowerValue !== undefined &&
                    gridEnergyValue !== undefined
                ) {
                    const gridSnapshot = new GridSnapshot()
                    gridSnapshot.snapshot = snapshot
                    gridSnapshot.energy = gridEnergyValue
                    gridSnapshot.power = gridPowerValue
                    gridSnapshot.device_id = device.id
                    database.persistEntity(gridSnapshot)
                }
            } else if (device instanceof PVDevice) {
                const pvPowerValue = await device.getPowerValue()
                const pvEnergyValue = await device.getEnergyValue()

                // if (pvPowerValue !== undefined) {
                //     totalPVPower += pvPowerValue
                // }

                if (pvPowerValue !== undefined && pvEnergyValue !== undefined) {
                    const pvSnapshot = new PvSnapshot()
                    pvSnapshot.snapshot = snapshot
                    pvSnapshot.energy = pvEnergyValue
                    pvSnapshot.power = pvPowerValue
                    pvSnapshot.device_id = device.id
                    database.persistEntity(pvSnapshot)
                }
            } else if (device instanceof BatteryDevice) {
                const socValue = await device.getSoCValue()
                const chargePowerValue = await device.getChargePowerValue()
                const dischargePowerValue =
                    await device.getDischargePowerValue()

                // if (chargePowerValue !== undefined)
                //     batteryChargePower = chargePowerValue

                // if (chargePowerValue !== undefined)
                //     batteryDischargePower = dischargePowerValue

                if (
                    socValue !== undefined &&
                    chargePowerValue !== undefined &&
                    dischargePowerValue !== undefined
                ) {
                    const batterySnapshot = new BatterySnapshot()
                    batterySnapshot.snapshot = snapshot
                    batterySnapshot.device_id = device.id
                    batterySnapshot.charge_power = chargePowerValue
                    batterySnapshot.discharge_power = dischargePowerValue
                    batterySnapshot.soc = socValue
                    database.persistEntity(batterySnapshot)
                }
            } else if (device instanceof ConsumerDevice) {
                const consumerPowerValue = await device.getPowerValue()

                // if (consumerPowerValue !== undefined)
                //     totalConsumerPower += consumerPowerValue

                if (consumerPowerValue !== undefined) {
                    const consumerSnapshot = new ConsumerSnapshot()
                    consumerSnapshot.snapshot = snapshot
                    consumerSnapshot.device_id = device.id
                    consumerSnapshot.power = consumerPowerValue
                    database.persistEntity(consumerSnapshot)
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

        websockets.emitEvent(WS_EVENT_LIVEDATA_UPDATED)
    }
}
