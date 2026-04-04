import { ModbusDatatype, ModbusInterface } from '@/interfaces/modbus'
import { DeviceBase, DeviceDefinition } from '../device.base'
import { ConsumerDevice } from '../consumer.device'
import { TPLinkTapoInterface } from '@/interfaces/tplink-tapo'

export class TapoP1xx extends DeviceBase implements ConsumerDevice {
    static override getDeviceDefinition(): DeviceDefinition {
        return {
            model: 'Tapo P1xx',
            types: [ConsumerDevice.DEVICE_TYPE],
            interfaces: ['tapo'],
        }
    }

    async getConsumerPowerValue(): Promise<number | undefined> {
        if (this._connector instanceof TPLinkTapoInterface) {
            return await this._connector.read({
                scale: -0.001,
                request: 'getEnergyUsage',
                parameter: 'current_power',
            })
        }

        return undefined
    }

    async getConsumerEnergyValue(): Promise<number | undefined> {
        if (this._connector instanceof TPLinkTapoInterface) {
            return await this._connector.read({
                scale: 0.001,
                request: 'getEnergyUsage',
                parameter: 'month_energy',
            })
        }

        return undefined
    }
}
