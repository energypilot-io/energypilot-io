import express from 'express'

import { createRequestHandler } from '@remix-run/express'
import compression from 'compression'

import { logging } from 'server/core/log-manager.js'
import { HTTPDef } from 'server/defs/configuration.js'

import { database } from './database-manager.js'
import { createServer, Server } from 'http'

export namespace http {
    export let httpServer: Server<any, any>

    export async function initHTTP(httpDef: HTTPDef | undefined) {
        const viteDevServer =
            process.env.NODE_ENV === 'production'
                ? null
                : await import('vite').then((vite) =>
                      vite.createServer({
                          server: { middlewareMode: true },
                      })
                  )

        const remixHandler = createRequestHandler({
            // @ts-ignore
            build: viteDevServer
                ? () =>
                      viteDevServer.ssrLoadModule('virtual:remix/server-build')
                : await import('../../build/server/index.js'),
        })

        const port = httpDef?.port || 3000

        const logger = logging.getLogger('http')

        const app = express()
        httpServer = createServer(app)

        app.use(compression())
        app.disable('x-powered-by')

        app.use(async (req, res, next: any) => {
            logger.debug(req.method, req.hostname, req.path)
            database.createContext(next)
        })

        if (viteDevServer) {
            app.use(viteDevServer.middlewares)
        } else {
            // Vite fingerprints its assets so we can cache forever.
            app.use(
                '/assets',
                express.static('../../build/client/assets', {
                    immutable: true,
                    maxAge: '1y',
                })
            )
        }

        app.use(express.static('../../build/client', { maxAge: '1h' }))

        app.all('*', remixHandler)

        httpServer.listen(port, () => {
            logger.info(`App listening on http://localhost:${port}`)
        })
    }
}
