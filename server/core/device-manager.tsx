import fs from 'fs'

import { DeviceDef } from 'server/defs/configuration'
import { logging } from './log-manager'
import { defaultDeviceConfig, IDevice } from 'server/devices/IDevice'
import { TemplateDef } from 'server/defs/template'
import { IConnector } from 'server/connectors/IConnector'
import { connectors } from './connector-manager'
import { GridDevice } from 'server/devices/grid'
import { GridSnapshot } from 'server/database/entities/grid-snapshot.entity'
import { database } from './database-manager'
import { Energy } from 'server/database/entities/energy.entity'
import { PVDevice } from 'server/devices/pv'
import { PvSnapshot } from 'server/database/entities/pv-snapshot.entity'
import { BatteryDevice } from 'server/devices/battery'

export const deviceClasses: { [id: string]: any } = {
    grid: GridDevice,
    pv: PVDevice,
    battery: BatteryDevice,
}

var _logger: logging.ChildLogger

const _deviceInstances: { [key: string]: IDevice } = {}

export namespace devices {
    export function initDevices(deviceDefs: Partial<DeviceDef>[] | undefined) {
        _logger = logging.getLogger('devices')

        if (deviceDefs === undefined) return

        deviceDefs.forEach((deviceDef) => {
            const configuration = { ...defaultDeviceConfig, ...deviceDef }

            const template = JSON.parse(
                fs.readFileSync(
                    `./templates/devices/${configuration.template}.json`,
                    'utf-8'
                )
            ) as TemplateDef

            if (
                configuration.type === undefined ||
                !(configuration.type in deviceClasses)
            ) {
                _logger.warn(
                    `No class found for device type'${configuration.type}`
                )
            } else {
                if (configuration.id in _deviceInstances) {
                    _logger.warn(
                        `Cannot create device with id [${configuration.id}]. The id is already existing.`
                    )
                } else {
                    const connector: IConnector | undefined =
                        connectors.getConnectorByID(configuration.connector)
                    if (connector === undefined) {
                        _logger.warn(
                            `Cannot create device with id [${configuration.id}]. No connector found for id [${configuration.connector}]`
                        )
                    } else {
                        _deviceInstances[configuration.id] = new deviceClasses[
                            configuration.type
                        ](connector, configuration, template)
                    }
                }
            }
        })

        const refreshInterval = setInterval(refreshValues, 5000)
        process.on('exit', (code) => {
            clearInterval(refreshInterval)
        })
    }

    async function refreshValues() {
        let totalGridPower = 0
        let totalPVPower = 0

        let batterySoC = null
        let batteryChargePower = null
        let batteryDischargePower = null

        const snapshotTimestamp = new Date()

        for (let key in _deviceInstances) {
            const device = _deviceInstances[key]

            if (device instanceof GridDevice) {
                const gridPowerValue = await device.getPowerValue()
                const gridEnergyValue = await device.getEnergyValue()

                if (gridPowerValue !== undefined) {
                    totalGridPower += gridPowerValue
                }

                if (
                    gridPowerValue !== undefined &&
                    gridEnergyValue !== undefined
                ) {
                    const gridSnapshot = new GridSnapshot()
                    gridSnapshot.createdAt = snapshotTimestamp
                    gridSnapshot.energy = gridEnergyValue
                    gridSnapshot.power = gridPowerValue
                    gridSnapshot.source = device.id

                    database.persistEntity(gridSnapshot)
                }
            } else if (device instanceof PVDevice) {
                const pvPowerValue = await device.getPowerValue()
                const pvEnergyValue = await device.getEnergyValue()

                if (pvPowerValue !== undefined) {
                    totalPVPower += pvPowerValue
                }

                if (pvPowerValue !== undefined && pvEnergyValue !== undefined) {
                    const pvSnapshot = new PvSnapshot()
                    pvSnapshot.createdAt = snapshotTimestamp
                    pvSnapshot.energy = pvEnergyValue
                    pvSnapshot.power = pvPowerValue
                    pvSnapshot.source = device.id

                    database.persistEntity(pvSnapshot)
                }
            } else if (device instanceof BatteryDevice) {
                const socValue = await device.getSoCValue()
                if (socValue !== undefined) {
                    batterySoC = socValue
                }

                const chargePowerValue = await device.getChargePowerValue()
                if (chargePowerValue !== undefined)
                    batteryChargePower = chargePowerValue

                const dischargePowerValue =
                    await device.getDischargePowerValue()
                if (chargePowerValue !== undefined)
                    batteryDischargePower = dischargePowerValue
            }
        }

        const consumption = Math.round(
            totalGridPower +
                totalPVPower +
                (batteryDischargePower !== null &&
                batteryDischargePower !== undefined
                    ? batteryDischargePower
                    : 0) -
                (batteryChargePower !== null && batteryChargePower !== undefined
                    ? batteryChargePower
                    : 0)
        )

        const energy = new Energy()
        energy.grid_power = totalGridPower
        energy.pv_power = Math.round(totalPVPower)
        energy.battery_soc = batterySoC!
        energy.battery_charge_power = batteryChargePower!
        energy.battery_discharge_power = batteryDischargePower!
        energy.consumption = consumption
        energy.source = 'EnergyPilot.io'

        database.persistEntity(energy)
    }
}
