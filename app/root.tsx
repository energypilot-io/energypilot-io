import clsx from 'clsx'
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'

import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
    useRouteLoaderData,
} from 'react-router';
import type { LinksFunction, LoaderFunctionArgs } from 'react-router';
import i18nServer, { localeCookie } from '~/lib/i18n.server'
import { useChangeLanguage } from 'remix-i18next/react'

import './tailwind.css'
import { themeSessionResolver } from './lib/sessions.server'
import { SocketProvider } from '~/context'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'
import i18next from 'i18next'
import { defaultNS } from 'i18n'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export const links: LinksFunction = () => [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
    },
    {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
    },
]

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { getTheme } = await themeSessionResolver(request)
    const locale = await i18nServer.getLocale(request)

    const body = JSON.stringify({
        locale,
        theme: getTheme(),
        interfaceTranslations: context.interfaceTranslations,
    })
    return new Response(body, {
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': await localeCookie.serialize(locale),
        },
    })
}

export function App() {
    const data = useRouteLoaderData<typeof loader>('root')
    const [theme] = useTheme()

    const [socket, setSocket] = useState<Socket>()

    useEffect(() => {
        const socket = io()
        setSocket(socket)
        return () => {
            socket.close()
        }
    }, [])

    useEffect(() => {
        if (!socket) return
        socket.on('confirmation', (data) => {
            console.log(data)
        })
    }, [socket])

    useEffect(() => {
        if (data?.interfaceTranslations === undefined) return

        Object.keys(data!.interfaceTranslations).forEach((lang: string) => {
            i18next.addResourceBundle(
                lang,
                defaultNS,
                { interfaces: data!.interfaceTranslations[lang] },
                true
            )
        })
    }, [data])

    return (
        <html lang={data?.locale ?? 'en'} className={clsx(theme)}>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="57x57"
                    href="/apple-icon-57x57.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="60x60"
                    href="/apple-icon-60x60.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="72x72"
                    href="/apple-icon-72x72.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="76x76"
                    href="/apple-icon-76x76.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="114x114"
                    href="/apple-icon-114x114.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="120x120"
                    href="/apple-icon-120x120.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="144x144"
                    href="/apple-icon-144x144.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="152x152"
                    href="/apple-icon-152x152.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/apple-icon-180x180.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="192x192"
                    href="/android-icon-192x192.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/favicon-32x32.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="96x96"
                    href="/favicon-96x96.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/favicon-16x16.png"
                />
                <link rel="manifest" href="/manifest.json" />
                <meta name="msapplication-TileColor" content="#ffffff" />
                <meta
                    name="msapplication-TileImage"
                    content="/ms-icon-144x144.png"
                />

                <Meta />
                <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
                <Links />
            </head>
            <body>
                <DndProvider backend={HTML5Backend}>
                    <SocketProvider socket={socket}>
                        <Outlet />
                    </SocketProvider>
                </DndProvider>

                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    )
}

export default function AppWithProviders() {
    const data = useLoaderData<typeof loader>()
    useChangeLanguage(data.locale)

    return (
        <ThemeProvider
            specifiedTheme={data.theme}
            themeAction="/action/set-theme"
        >
            <App />
        </ThemeProvider>
    )
}
