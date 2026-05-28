import { initLogging } from './core/log.manager'
import { initDatabaseManager } from './core/database.manager'
import { initDeviceManager } from './core/device.manager'
import { initSettingManager } from './core/setting.manager'

import { initDataUpdateManager } from './core/data-update.manager'
import { initWebServer } from './core/webserver'
import { initModuleManager } from './core/module.manager'

await initLogging()
await initDatabaseManager()
await initSettingManager()
await initDeviceManager()
await initDataUpdateManager()
await initWebServer()

await initModuleManager()
