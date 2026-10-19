import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { getLogger } from './log-manager.js'
import {
    DEFAULT_API_PASSWORD,
    getApiPassword,
    isApiAuthorized,
    isApiPasswordRequired,
} from './api-auth.js'

import {
    DevicesController,
    McpController,
    ModulesController,
    SettingsController,
    SnapshotsController,
    SolarForecastController,
} from '@/controllers/index.js'

let _httpServer: HTTPServer<any, any>
let _io: SocketServer

export async function initWebServer() {
    const app = express()
    const port = 3000
    const host = process.env.HOST ?? '127.0.0.1'

    app.use(
        cors({
            exposedHeaders: [
                'WWW-Authenticate',
                'Mcp-Session-Id',
                'Last-Event-Id',
                'Mcp-Protocol-Version',
            ],
            origin:
                process.env.CORS_ORIGINS?.split(',').map(origin =>
                    origin.trim()
                ) ?? false,
        })
    )
    app.use(compression())
    app.disable('x-powered-by')
    app.use(express.json({ limit: '1mb' }))
    app.use(express.urlencoded({ extended: false, limit: '1mb' }))

    app.get('/api/v1/auth/status', (_req, res) => {
        const password = getApiPassword()
        return res.json({
            passwordRequired: isApiPasswordRequired(),
            usingDefaultPassword: password === DEFAULT_API_PASSWORD,
        })
    })

    app.use('/api/v1', (req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

        if (isApiAuthorized(req.get('x-api-password'))) return next()
        return res.status(401).json({
            message: 'Password required',
            passwordRequired: isApiPasswordRequired(),
        })
    })
    app.use('/api/v1/devices', DevicesController)
    app.use('/api/v1/snapshots', SnapshotsController)
    app.use('/api/v1/settings', SettingsController)
    app.use('/api/v1/solar-forecast', SolarForecastController)
    app.use('/api/v1/modules', ModulesController)

    app.use('/mcp', (req, res, next) => {
        if (isApiAuthorized(req.get('x-api-password'))) return next()
        return res.status(401).json({ message: 'Password required' })
    })
    app.use('/mcp', McpController)

    if (process.env.NODE_ENV! === 'production') {
        app.use(express.static('/usr/share/html'))

        app.get('/{*all}', function (req, res) {
            res.sendFile('/usr/share/html/index.html')
        })
    }

    _httpServer = createServer(app)
    _io = new SocketServer(_httpServer)

    _io.on('connection', socket => {
        getLogger('websocket').debug(
            `Websocket client connected: [${socket.id}]`
        )
    })

    _httpServer.listen(port, host, () => {
        console.log(`Server running on http://${host}:${port}`)
    })
}

export function emitWebsocketEvent(event: string, ...args: any[]) {
    _io.emit(event, ...args)
}
