import { initLogging } from './core/log.manager.js'
import { initDatabaseManager } from './core/database.manager.js'
import { initDeviceManager } from './core/device.manager.js'
import { initSettingManager } from './core/setting.manager.js'

import { initDataUpdateManager } from './core/data-update.manager.js'
import { initWebServer } from './core/webserver.js'
import { initModuleManager } from './core/module.manager.js'

await initLogging()
await initDatabaseManager()
await initSettingManager()
await initDeviceManager()
await initDataUpdateManager()
await initWebServer()

await initModuleManager()
