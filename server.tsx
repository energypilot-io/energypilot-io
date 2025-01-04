import fs from 'fs'
import path from 'node:path'

import { ConfigurationDef } from 'server/defs/configuration'
import { logging } from 'server/core/log-manager'
import { database } from 'server/core/database-manager'
import { http } from 'server/core/http-manager'
import { connectors } from 'server/core/connector-manager'
import { devices } from 'server/core/device-manager'
import { websockets } from 'server/core/websockets-manager'

const ENVIRONMENTAL_VARIABLES = ['CONFIG_FILE', 'DATA_DIR']

ENVIRONMENTAL_VARIABLES.forEach((key: string) => {
    if (process.env[key] === undefined) {
        throw new Error(`Missing environmental variable '${key}'`)
    }
})

const config = JSON.parse(
    fs.readFileSync(
        path.join(process.env.DATA_DIR!, process.env.CONFIG_FILE!),
        'utf-8'
    )
) as ConfigurationDef

await logging.initLogging(config.logging)
await database.initDatabase(config.database)
await http.initHTTP(config.http)
await websockets.initWebSockets(http.httpServer)

await connectors.initConnectors(config.connectors)
await devices.initDevices(config.devices)

// const job = nodeCron.schedule('* * * * * */5', function jobYouNeedToExecute() {
//     // Do whatever you want in here. Send email, Make  database backup or download data.
//     console.log(new Date().toLocaleString())
// })
