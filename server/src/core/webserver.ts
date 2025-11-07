import express from 'express'
import cors from 'cors'
import compression from 'compression'

import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { getLogger } from './logmanager'

import { DeviceController, SnapshotController } from '@/controllers'

let _httpServer: HTTPServer<any, any>
let _io: SocketServer

export async function initWebServer() {
    const app = express()
    const port = 3000

    app.use(cors())
    app.use(compression())
    app.disable('x-powered-by')
    app.use(express.json())

    app.use('/api/v1/devices', DeviceController)
    app.use('/api/v1/snapshots', SnapshotController)

    if (process.env.NODE_ENV! === 'production') {
        app.use(express.static('/usr/share/html'))

        app.get('/{*all}', function (req, res) {
            res.sendFile('/usr/share/html/index.html')
        })
    }

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
