import { initLogging } from './core/logmanager'
import { initTemplateEngine } from './core/template-engine'
import { initDatabase } from './core/database'
import { initDeviceManager } from './core/device-manager'
import { initDataUpdateManager } from './core/data-update-manager'
import { initWebServer } from './core/webserver'

await initLogging()
await initTemplateEngine()
await initDatabase()

await initDeviceManager()

await initDataUpdateManager()

await initWebServer()
