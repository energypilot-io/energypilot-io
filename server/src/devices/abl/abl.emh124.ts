import { ModbusDatatype, ModbusInterface } from '@/interfaces/modbus'
import { DeviceBase, DeviceDefinition } from '../device.base'
import { ConsumerDevice } from '../consumer.device'

export class ABLemh124 extends DeviceBase implements ConsumerDevice {
    static override getDeviceDefinition(): DeviceDefinition {
        return {
            model: 'ABL emh1/2/4',
            types: [ConsumerDevice.DEVICE_TYPE],
            interfaces: ['modbus'],
        }
    }

    private async getValue(
        address: number,
        size: number,
        scale: number,
        datatype: ModbusDatatype,
        register: 'holding' | 'input' = 'holding',
        offset: number = 0,
        bitmask?: number
    ) {
        var value: number | undefined = undefined

        if (this._connector instanceof ModbusInterface) {
            value = await this._connector.read({
                address: address,
                size: size,
                scale: scale,
                datatype: datatype,
                offset: offset,
                bitmask: bitmask,
                register: register,
            })
        }

        return value
    }

    async getConsumerPowerValue(): Promise<number | undefined> {
        return undefined
    }

    async getConsumerEnergyValue(): Promise<number | undefined> {
        const isActive = await this.getValue(
            15,
            5,
            1,
            'uint16be',
            'holding',
            6,
            4095
        )

        if (isActive === undefined || isActive - 1000 === 0) {
            return undefined
        }

        const current1 = await this.getValue(
            46,
            5,
            0.01,
            'uint16be',
            'holding',
            4
        )
        const current2 = await this.getValue(
            46,
            5,
            0.01,
            'uint16be',
            'holding',
            6
        )
        const current3 = await this.getValue(
            46,
            5,
            0.01,
            'uint16be',
            'holding',
            8
        )

        if (current1 && current2 && current3) {
            return (current1 + current2 + current3) * -230
        }

        return undefined
    }
}
