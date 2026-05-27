import { initSolarForecast } from '@/modules/solar-forecast.module'
import { initTelegramBot } from '@/modules/telegram-bot.module'

export async function initModuleManager() {
    await initTelegramBot()
    await initSolarForecast()
}
