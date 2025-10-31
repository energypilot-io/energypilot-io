import { BatteryDevice } from '@/devices/battery'
import { ConsumerDevice } from '@/devices/consumer'
import { GridDevice } from '@/devices/grid'
import { PVDevice } from '@/devices/pv'
import { ModbusInterface } from '@/interfaces/modbus'

export const RegisteredInterfaceClasses: { [key: string]: any } = {
    modbus: ModbusInterface,
}

export const RegisteredDeviceClasses: { [key: string]: any } = {
    pv: PVDevice,
    battery: BatteryDevice,
    grid: GridDevice,
    consumer: ConsumerDevice,
}
