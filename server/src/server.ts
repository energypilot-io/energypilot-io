import { initLogging } from './core/log.manager.js'
import { initDatabaseManager } from './core/database.manager.js'
import { initDeviceManager } from './core/device.manager.js'
import { initSettingManager } from './core/setting.manager.js'

import { initSnapshotManager } from './core/snapshot.manager.js'
import { initWebServer } from './core/webserver.js'
import { initModuleManager } from './core/module.manager.js'

await initLogging()
await initDatabaseManager()
await initSettingManager()
await initDeviceManager()
await initSnapshotManager()
await initWebServer()

await initModuleManager()
