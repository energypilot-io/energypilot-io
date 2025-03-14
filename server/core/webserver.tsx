import express from 'express'
import compression from 'compression'
import path from 'path'

import { createRequestHandler } from '@remix-run/express'
import { createServer, Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { ServerBuild } from '@remix-run/node'
import { fileURLToPath } from 'url'
import { getLogger } from './logmanager'
import {
    getRegisteredSettingDefs,
    getSettingAsNumber,
    registerSettings,
} from './settings.js'
import { createContext } from './database.js'
import { getTemplateDefs } from './template-engine.js'
import { getInterfaceDefs, getInterfaceTranslations } from './devices.js'

export type ClientConnectedObserver = () => void

const _clientConnectedObservers: ClientConnectedObserver[] = []

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const _settingKeyWebserverPort = 'webserver_port'

let _httpServer: HTTPServer<any, any>
let _io: SocketServer

export async function initWebServer() {
    registerSettings({
        [_settingKeyWebserverPort]: {
            type: 'number',
            defaultValue: 3000,
            min: 1024,
            max: 65535,
        },
    })

    const port = await getSettingAsNumber(_settingKeyWebserverPort)

    const viteDevServer =
        process.env.NODE_ENV === 'production'
            ? undefined
            : await import('vite').then((vite) =>
                  vite.createServer({
                      server: { middlewareMode: true },
                  })
              )

    const app = express()
    app.use(compression())
    app.disable('x-powered-by')

    app.use(async (req, res, next: any) => {
        getLogger('http').debug(req.method, req.hostname, req.path)
        createContext(next)
    })

    if (viteDevServer) {
        app.use(viteDevServer.middlewares)
    } else {
        // Vite fingerprints its assets so we can cache forever.
        app.use(
            '/assets',
            express.static(path.join(__dirname, '../../build/client/assets'), {
                immutable: true,
                maxAge: '1y',
            })
        )
    }

    app.use(
        express.static(path.join(__dirname, '../../build/client'), {
            maxAge: '1h',
        })
    )

    async function getBuild() {
        try {
            const build = viteDevServer
                ? await viteDevServer.ssrLoadModule(
                      'virtual:remix/server-build'
                  )
                : await import('../../build/server/index.js')

            return { build: build as unknown as ServerBuild, error: null }
        } catch (error) {
            // Catch error and return null to make express happy and avoid an unrecoverable crash
            console.error('Error creating build:', error)
            return { error: error, build: null as unknown as ServerBuild }
        }
    }

    app.all(
        '*',
        createRequestHandler({
            build: async () => {
                const { error, build } = await getBuild()
                if (error) {
                    throw error
                }
                return build
            },
            getLoadContext(req, res) {
                return {
                    templates: getTemplateDefs(),
                    interfaces: getInterfaceDefs(),
                    interfaceTranslations: getInterfaceTranslations(),
                    settings: getRegisteredSettingDefs(),
                    res,
                }
            },
        })
    )

    _httpServer = createServer(app)
    _httpServer.listen(port, () => {
        getLogger('http').log(`App listening on http://localhost:${port}`)
    })

    _io = new SocketServer(_httpServer)

    _io.on('connection', (socket) => {
        getLogger('websocket').debug(
            `Websocket client connected: [${socket.id}]`
        )

        setTimeout(() => {
            _clientConnectedObservers.forEach((clientConnectedObserver) => {
                clientConnectedObserver()
            })
        }, 1000)
    })
}

export function registerClientConnectedObserver(
    observer: ClientConnectedObserver
) {
    _clientConnectedObservers.push(observer)
}

export function emitWebsocketEvent(event: string, ...args: any[]) {
    _io.emit(event, ...args)
}
