import express from 'express'

import { createRequestHandler } from '@remix-run/express'
import compression from 'compression'

import { logging } from 'server/core/log-manager.js'
import { HTTPDef } from 'server/defs/configuration.js'

import { database } from './database-manager.js'
import { createServer, Server } from 'http'
import { ServerBuild } from '@remix-run/node'

import path from 'path'
import { fileURLToPath } from 'url'
import { templates } from './template-manager.js'
import { devices } from './devices.js'
import { settings } from './settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export namespace http {
    export let httpServer: Server<any, any>

    export async function initHTTP(httpDef: HTTPDef | undefined) {
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
            logging.getLogger('http').debug(req.method, req.hostname, req.path)
            database.createContext(next)
        })

        if (viteDevServer) {
            app.use(viteDevServer.middlewares)
        } else {
            // Vite fingerprints its assets so we can cache forever.
            app.use(
                '/assets',
                express.static(
                    path.join(__dirname, '../../build/client/assets'),
                    {
                        immutable: true,
                        maxAge: '1y',
                    }
                )
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
                        templates: templates.getTemplateDefs(),
                        interfaces: devices.getInterfaceDefs(),
                        interfaceTranslations:
                            devices.getInterfaceTranslations(),
                        settings: settings.getRegisteredSettingDefs(),
                        res,
                    }
                },
            })
        )

        const port = httpDef?.port || 3000

        httpServer = createServer(app)
        httpServer.listen(port, () => {
            logging
                .getLogger('http')
                .info(`App listening on http://localhost:${port}`)
        })
    }
}
