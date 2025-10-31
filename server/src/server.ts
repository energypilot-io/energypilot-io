import express from 'express'
import cors from 'cors'
import compression from 'compression'

import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'

import { getLogger, initLogging } from './core/logmanager'
import { initTemplateEngine } from './core/template-engine'
import { initDatabase } from './core/database'

import { DeviceController } from './controllers'
import { initDeviceManager } from './core/device-manager'
import { initDataUpdateManager } from './core/data-update-manager'

await initLogging()
await initTemplateEngine()
await initDatabase()

await initDeviceManager()

await initDataUpdateManager()

let _httpServer: HTTPServer<any, any>
let _io: SocketServer

const app = express()
const port = 3000

app.use(cors())
app.use(compression())
app.disable('x-powered-by')
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello from Express!')
})

app.use('/api/v1/devices', DeviceController)
app.use((req, res) => res.status(404).json({ message: 'No route found' }))

_httpServer = createServer(app)
_io = new SocketServer(_httpServer)

_io.on('connection', (socket) => {
    getLogger('websocket').debug(`Websocket client connected: [${socket.id}]`)
})

_httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})
