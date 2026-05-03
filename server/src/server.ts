import { initLogging } from './core/log.manager'
import { initDatabase } from './core/database'
import { initDeviceManager } from './core/device.manager'
import { initDataUpdateManager } from './core/data-update.manager'
import { initWebServer } from './core/webserver'
import { initSettingManager } from './core/setting.manager'
import { initTelegramBot } from './modules/telegram-bot'

await initLogging()
await initDatabase()
await initSettingManager()
await initDeviceManager()
await initDataUpdateManager()
await initWebServer()

await initTelegramBot()
