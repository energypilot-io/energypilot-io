import { PassThrough } from 'node:stream'

import type { AppLoadContext, EntryContext } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { createInstance, i18n as i18next } from 'i18next'
import i18nServer from '~/lib/i18n.server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import * as i18n from 'i18n'

const ABORT_DELAY = 5_000

export default async function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
    // This is ignored so we can keep it in the template for visibility.  Feel
    // free to delete this parameter in your app if you're not using it!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadContext: AppLoadContext
) {
    const instance = createInstance()
    const lng = await i18nServer.getLocale(request)
    const ns = i18nServer.getRouteNamespaces(reactRouterContext)

    await instance.use(initReactI18next).init({ ...i18n, lng, ns })

    return isbot(request.headers.get('user-agent') || '')
        ? handleBotRequest(
              request,
              responseStatusCode,
              responseHeaders,
              reactRouterContext,
              loadContext,
              instance
          )
        : handleBrowserRequest(
              request,
              responseStatusCode,
              responseHeaders,
              reactRouterContext,
              loadContext,
              instance
          );
}

async function handleBotRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
    _loadContext: AppLoadContext,
    i18next: i18next
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false
        const { pipe, abort } = renderToPipeableStream(
            <I18nextProvider i18n={i18next}>
                <ServerRouter
                    context={reactRouterContext}
                    url={request.url}
                    abortDelay={ABORT_DELAY}
                />
            </I18nextProvider>,
            {
                onAllReady() {
                    shellRendered = true
                    const body = new PassThrough()
                    const stream = createReadableStreamFromReadable(body)

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        })
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            }
        )

        setTimeout(abort, ABORT_DELAY)
    });
}

async function handleBrowserRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
    _loadContext: AppLoadContext,
    i18next: i18next
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false
        const { pipe, abort } = renderToPipeableStream(
            <I18nextProvider i18n={i18next}>
                <ServerRouter
                    context={reactRouterContext}
                    url={request.url}
                    abortDelay={ABORT_DELAY}
                />
            </I18nextProvider>,
            {
                onShellReady() {
                    shellRendered = true
                    const body = new PassThrough()
                    const stream = createReadableStreamFromReadable(body)

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        })
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            }
        )

        setTimeout(abort, ABORT_DELAY)
    });
}
