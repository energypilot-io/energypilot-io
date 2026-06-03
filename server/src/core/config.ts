import { DeviceBase } from '@/devices/device.base.js'

import { ModbusInterface } from '@/interfaces/modbus.js'
import { TPLinkTapoInterface } from '@/interfaces/tplink-tapo.js'

import { ABLemh124 } from '@/devices/abl/abl.emh124.js'
import { SungrowAC011E01 } from '@/devices/sungrow/sungrow.ac011e-01.js'
import { SungrowHybrid } from '@/devices/sungrow/sungrow.hybrid.js'
import { TapoP1xx } from '@/devices/tapo/tapo.p1xx.js'
import { ModuleBase } from '@/modules/module.base.js'
import { TelegramBotModule } from '@/modules/telegram-bot.module.js'
import { SolarForecastModule } from '@/modules/solar-forecast.module.js'

export const RegisteredInterfaceClasses: { [key: string]: any } = {
    modbus: ModbusInterface,
    tapo: TPLinkTapoInterface,
}

export const RegisteredDeviceClasses: (typeof DeviceBase)[] = [
    SungrowHybrid,
    SungrowAC011E01,
    ABLemh124,
    TapoP1xx,
]

export const RegisteredModules: (typeof ModuleBase)[] = [
    TelegramBotModule,
    SolarForecastModule,
]
