import { DeviceBase } from '@/devices/device.base'

import { ModbusInterface } from '@/interfaces/modbus'
import { TPLinkTapoInterface } from '@/interfaces/tplink-tapo'

import { ABLemh124 } from '@/devices/abl/abl.emh124'
import { SungrowAC011E01 } from '@/devices/sungrow/sungrow.ac011e-01'
import { SungrowHybrid } from '@/devices/sungrow/sungrow.hybrid'

export const RegisteredInterfaceClasses: { [key: string]: any } = {
    modbus: ModbusInterface,
    tapo: TPLinkTapoInterface,
}

export const RegisteredDeviceClasses: (typeof DeviceBase)[] = [
    SungrowHybrid,
    SungrowAC011E01,
    ABLemh124,
]
