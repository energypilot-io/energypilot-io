import express from 'express'

import { createRequestHandler } from '@remix-run/express'
import { ServerBuild } from '@remix-run/node'

import { logging } from 'server/core/log-manager.js'
import { HTTPDef } from 'server/defs/configuration.js'

import { database } from './database-manager.js'

export namespace http {
    export async function initHTTP(httpDef: HTTPDef | undefined) {
        const viteDevServer =
            process.env.NODE_ENV === 'production'
                ? null
                : await import('vite').then((vite) =>
                      vite.createServer({
                          server: { middlewareMode: true },
                      })
                  )

        const port = httpDef?.port || 3000

        const logger = logging.getLogger('http')
        const app = express()

        app.use(async (req, res, next: any) => {
            database.createContext(next)
        })

        app.use(
            viteDevServer
                ? viteDevServer.middlewares
                : express.static('build/client')
        )
        app.use((req, res, next) => {
            logger.debug(req.method, req.hostname, req.path)
            next()
        })

        const build = viteDevServer
            ? () =>
                  viteDevServer.ssrLoadModule(
                      'virtual:remix/server-build'
                  ) as Promise<ServerBuild>
            : await import('../../build/server/index.js')

        app.all('*', createRequestHandler({ build } as any))

        app.listen(port, () => {
            logger.info(`App listening on http://localhost:${port}`)
        })
    }
}
