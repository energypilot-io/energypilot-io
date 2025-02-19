import fs from 'fs'
import path from 'node:path'

import { ConfigurationDef } from 'server/defs/configuration'
import { database } from 'server/core/database-manager'
import { http } from 'server/core/http-manager'
import { websockets } from 'server/core/websockets-manager'
import { dataupdate } from 'server/core/data-update-manager'
import { templates } from 'server/core/template-manager'
import { Device } from 'server/database/entities/device.entity'
import { devices } from 'server/core/devices'
import { initLogging } from 'server/core/logmanager'

const ENVIRONMENTAL_VARIABLES = ['DATA_DIR']

ENVIRONMENTAL_VARIABLES.forEach((key: string) => {
    if (process.env[key] === undefined) {
        throw new Error(`Missing environmental variable '${key}'`)
    }
})

const config = JSON.parse(
    fs.readFileSync(
        path.join(
            process.env.DATA_DIR!,
            process.env.CONFIG_FILE ?? 'energypilot-io.json'
        ),
        'utf-8'
    )
) as ConfigurationDef

await initLogging()
await database.initDatabase(config.database)
await templates.initTemplateEngine()

await http.initHTTP(config.http)
await websockets.initWebSockets(http.httpServer)

/*
 * Load all devices stored in the database
 */

const em = database.getEntityManager()

const deviceConfigurations = await em.findAll(Device)
deviceConfigurations.map(async (device) => {
    await devices.deviceFactory(device)
})

// await connectors.initConnectors(config.connectors)
// await devices.initDevices(config.devices)

await dataupdate.initDataUpdate()
