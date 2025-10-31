import { GridDevice } from '@/devices/grid'
import { getDeviceInstances, resetAllDeviceCaches } from './device-manager'
import { getLogger } from './logmanager'
import { PVDevice } from '@/devices/pv'
import { BatteryDevice } from '@/devices/battery'
import { ConsumerDevice } from '@/devices/consumer'
import { Snapshot } from '@/entities/snapshot.entity'
import { persistEntity } from './database'
import { DeviceValue } from '@/entities/device.value.entity'

let _pollDataIntervalObject: NodeJS.Timeout

export async function initDataUpdateManager() {
    _pollDataIntervalObject = setInterval(pollData, 5000)

    process.on('exit', () => {
        clearInterval(_pollDataIntervalObject)
    })
}

async function pollData() {
    resetAllDeviceCaches()

    const logger = getLogger('dataupdate')

    logger.debug('Collecting live data from devices')

    const snapshot = new Snapshot()
    snapshot.created_at = new Date()

    const deviceInstances = getDeviceInstances()

    for (let key in deviceInstances) {
        const deviceInstance = deviceInstances[key]
        const isEnabled = deviceInstance.deviceDefinition.is_enabled

        if (!isEnabled) continue

        if (deviceInstance instanceof GridDevice) {
            const power = await deviceInstance.getPowerValue()
            const energyImport = await deviceInstance.getEnergyImportValue()
            const energyExport = await deviceInstance.getEnergyExportValue()

            if (
                power !== undefined &&
                energyImport !== undefined &&
                energyExport !== undefined
            ) {
                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy_import',
                        value: energyImport,
                    })
                )

                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy_export',
                        value: energyExport,
                    })
                )
            }

            logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy Import: ${energyImport} kWh, Energy Export: ${energyExport} kWh`
            )
        } else if (deviceInstance instanceof PVDevice) {
            const power = await deviceInstance.getPowerValue()
            const energy = await deviceInstance.getEnergyValue()

            if (power !== undefined && energy !== undefined) {
                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy',
                        value: energy,
                    })
                )
            }

            logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy: ${energy} kWh`
            )
        } else if (deviceInstance instanceof BatteryDevice) {
            const soc = await deviceInstance.getSoCValue()
            const power = await deviceInstance.getPowerValue()

            if (power !== undefined && soc !== undefined) {
                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'soc',
                        value: soc,
                    })
                )
            }

            logger.debug(
                deviceInstance.deviceDefinition.name,
                `SoC: ${soc} %, Power: ${power} W`
            )
        } else if (deviceInstance instanceof ConsumerDevice) {
            const power = await deviceInstance.getPowerValue()
            const energy = await deviceInstance.getEnergyValue()

            if (power !== undefined && energy !== undefined) {
                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'power',
                        value: power,
                    })
                )

                snapshot.device_snapshots.add(
                    new DeviceValue({
                        device: deviceInstance.deviceDefinition,
                        name: 'energy',
                        value: energy,
                    })
                )
            }

            logger.debug(
                deviceInstance.deviceDefinition.name,
                `Power: ${power} W, Energy: ${energy} kWh`
            )
        }
    }

    if (snapshot.device_snapshots.isEmpty()) {
        logger.debug(
            'No device values collected, skipping snapshot persistence'
        )
        return
    }

    await persistEntity(snapshot)
}
