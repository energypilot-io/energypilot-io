import { Device } from 'server/database/entities/device.entity'
import { initLogging } from 'server/core/logmanager'
import { initWebServer } from 'server/core/webserver'
import { getEntityManager, initDatabase } from 'server/core/database'
import { initTemplateEngine } from 'server/core/template-engine'
import { createDevice } from 'server/core/devices'
import { initDataUpdate } from 'server/core/data-update-manager'
import { initWeatherAddon } from 'server/addons/weather'

const ENVIRONMENTAL_VARIABLES = ['DATA_DIR']

ENVIRONMENTAL_VARIABLES.forEach((key: string) => {
    if (process.env[key] === undefined) {
        throw new Error(`Missing environmental variable '${key}'`)
    }
})

await initLogging()
await initDatabase()
await initTemplateEngine()

await initWebServer()

/*
 * Load all devices stored in the database
 */

const em = getEntityManager()

const deviceConfigurations = await em.findAll(Device)
deviceConfigurations.map(async (device) => {
    await createDevice(device)
})

/*
 * Load all AddOns
 */

await initWeatherAddon()

await initDataUpdate()
