import { initLogging } from './core/logmanager'
import { initDatabase } from './core/database'
import { initDeviceManager } from './core/device-manager'
import { initDataUpdateManager } from './core/data-update-manager'
import { initWebServer } from './core/webserver'
import { initSettingsManager } from './core/settings-manager'
import { initTelegramBot } from './core/telegram-bot'

await initLogging()
await initDatabase()
await initSettingsManager()
await initDeviceManager()
await initDataUpdateManager()
await initWebServer()

await initTelegramBot()
