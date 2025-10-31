import express from 'express'
import cors from 'cors'
import compression from 'compression'

import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { getLogger } from './logmanager'

import { DeviceController } from '@/controllers'

let _httpServer: HTTPServer<any, any>
let _io: SocketServer

export async function initWebServer() {
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
        getLogger('websocket').debug(
            `Websocket client connected: [${socket.id}]`
        )
    })

    _httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`)
    })
}

export function emitWebsocketEvent(event: string, ...args: any[]) {
    _io.emit(event, ...args)
}
