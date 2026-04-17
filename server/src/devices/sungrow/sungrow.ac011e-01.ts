import { ModbusDatatype, ModbusInterface } from '@/interfaces/modbus'
import { DeviceBase, DeviceDefinition } from '../device.base'
import { ConsumerDevice } from '../consumer.device'

export class SungrowAC011E01 extends DeviceBase implements ConsumerDevice {
    static override getDeviceDefinition(): DeviceDefinition {
        return {
            model: 'Sungrow AC011E-01',
            types: [ConsumerDevice.DEVICE_TYPE],
            interfaces: ['modbus'],
        }
    }

    private async getValue(
        address: number,
        size: number,
        scale: number,
        datatype: ModbusDatatype,
        register: 'holding' | 'input' = 'holding'
    ) {
        let value: number | undefined = undefined

        if (this._connector instanceof ModbusInterface) {
            value = await this._connector.read({
                address: address,
                size: size,
                scale: scale,
                datatype: datatype,
                register: register,
            })
        }

        return value
    }

    async getConsumerPowerValue(_delta: number): Promise<number | undefined> {
        const power = await this.getValue(21307, 2, -1, 'uint32sw', 'input')
        const isActive = await this.getValue(21267, 1, 1, 'uint16', 'input')

        if (power !== undefined && isActive !== undefined) {
            return power * isActive
        }

        return undefined
    }

    async getConsumerEnergyValue(_delta: number): Promise<number | undefined> {
        return await this.getValue(21200, 2, -0.001, 'uint32sw')
    }
}
