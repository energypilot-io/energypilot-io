import { ModbusDatatype, ModbusInterface } from '@/interfaces/modbus'
import { BatteryDevice } from '../battery.device'
import { DeviceBase, DeviceDefinition } from '../device.base'
import { GridDevice } from '../grid.device'
import { PVDevice } from '../pv.device'

export class SungrowHybrid
    extends DeviceBase
    implements BatteryDevice, GridDevice, PVDevice
{
    static override getDeviceDefinition(): DeviceDefinition {
        return {
            model: 'Sungrow Hybrid',
            types: [
                BatteryDevice.DEVICE_TYPE,
                GridDevice.DEVICE_TYPE,
                PVDevice.DEVICE_TYPE,
            ],
            interfaces: ['modbus'],
        }
    }

    private async getValue(
        address: number,
        size: number,
        scale: number,
        datatype: ModbusDatatype
    ) {
        let value: number | undefined = undefined

        if (this._connector instanceof ModbusInterface) {
            value = await this._connector.read({
                address: address,
                size: size,
                scale: scale,
                datatype: datatype,
            })
        }

        return value
    }

    async getBatterySoCValue(_delta: number): Promise<number | undefined> {
        return await this.getValue(13022, 1, 0.1, 'uint16')
    }

    async getBatteryPowerValue(_delta: number): Promise<number | undefined> {
        const voltage = await this.getValue(13019, 1, 0.1, 'uint16be')
        const current = await this.getValue(13020, 1, 0.1, 'int16be')

        if (voltage !== undefined && current !== undefined) {
            return voltage * current
        }

        return undefined
    }

    async getGridPowerValue(_delta: number): Promise<number | undefined> {
        return await this.getValue(13009, 2, -1, 'int32sw')
    }

    async getGridEnergyImportValue(
        _delta: number
    ): Promise<number | undefined> {
        return await this.getValue(13036, 2, 0.1, 'uint32sw')
    }

    async getGridEnergyExportValue(
        _delta: number
    ): Promise<number | undefined> {
        return await this.getValue(13045, 2, 0.1, 'uint32sw')
    }

    async getPVPowerValue(_delta: number): Promise<number | undefined> {
        const mpptVoltage1 = await this.getValue(5010, 1, 0.1, 'uint16be')
        const mpptCurrent1 = await this.getValue(5011, 1, 0.1, 'uint16be')
        const mpptVoltage2 = await this.getValue(5012, 1, 0.1, 'uint16be')
        const mpptCurrent2 = await this.getValue(5011, 1, 0.1, 'uint16be')

        if (
            mpptVoltage1 !== undefined &&
            mpptCurrent1 !== undefined &&
            mpptVoltage2 !== undefined &&
            mpptCurrent2 !== undefined
        ) {
            return mpptVoltage1 * mpptCurrent1 + mpptVoltage2 * mpptCurrent2
        }

        return undefined
    }

    async getPVEnergyValue(_delta: number): Promise<number | undefined> {
        return await this.getValue(13002, 2, 0.1, 'uint32sw')
    }
}
