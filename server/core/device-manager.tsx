import fs from 'fs'

import { DeviceDef } from 'server/defs/configuration'
import { logging } from './log-manager'
import { defaultDeviceConfig, IDevice } from 'server/devices/IDevice'
import { TemplateDef } from 'server/defs/template'
import { IConnector } from 'server/connectors/IConnector'
import { connectors } from './connector-manager'
import { GridDevice } from 'server/devices/grid'
import { PVDevice } from 'server/devices/pv'
import { BatteryDevice } from 'server/devices/battery'
import { ConsumerDevice } from 'server/devices/consumer'

export const deviceClasses: { [id: string]: any } = {
    grid: GridDevice,
    pv: PVDevice,
    battery: BatteryDevice,
    consumer: ConsumerDevice,
}

var _logger: logging.ChildLogger

export namespace devices {
    export const instances: { [key: string]: IDevice } = {}

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
                if (configuration.id in instances) {
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
                        instances[configuration.id] = new deviceClasses[
                            configuration.type
                        ](connector, configuration, template)
                    }
                }
            }
        })
    }
}
