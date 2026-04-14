import { ModbusDatatype, ModbusInterface } from '@/interfaces/modbus'
import { DeviceBase, DeviceDefinition } from '../device.base'
import { ConsumerDevice } from '../consumer.device'
import { IInterface } from '@/interfaces/interface'
import { Device } from '@/entities/device.entity'

export class ABLemh124 extends DeviceBase implements ConsumerDevice {
    private _totalEnergy: number = 0

    constructor(
        connector: IInterface,
        deviceDefinition: Device,
        latestValues: Map<string, number>
    ) {
        super(connector, deviceDefinition, latestValues)

        if (latestValues !== undefined) {
            this._totalEnergy = latestValues.get('energy') ?? 0
        }
    }

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
        let value: number | undefined = undefined

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

    async getConsumerPowerValue(_delta: number): Promise<number | undefined> {
        const isActive = await this.getValue(
            15,
            5,
            1,
            'uint16be',
            'holding',
            6,
            4095
        )

        if (isActive && isActive - 1000 === 0) {
            return 0
        }

        const current1 = await this.getValue(
            46,
            5,
            0.1,
            'uint16be',
            'holding',
            4
        )
        const current2 = await this.getValue(
            46,
            5,
            0.1,
            'uint16be',
            'holding',
            6
        )
        const current3 = await this.getValue(
            46,
            5,
            0.1,
            'uint16be',
            'holding',
            8
        )

        if (
            current1 !== undefined &&
            current2 !== undefined &&
            current3 !== undefined
        ) {
            return (current1 + current2 + current3) * -230
        }

        return undefined
    }

    async getConsumerEnergyValue(delta: number): Promise<number | undefined> {
        const currentPower = await this.getConsumerPowerValue(delta)
        if (currentPower === undefined) {
            return undefined
        }

        this._totalEnergy += (currentPower * delta) / 3600000000

        return this._totalEnergy
    }
}
