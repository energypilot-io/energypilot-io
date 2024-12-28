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
} from '@remix-run/react'
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import i18nServer, { localeCookie } from '~/lib/i18n.server'
import { useChangeLanguage } from 'remix-i18next/react'

import './tailwind.css'
import { themeSessionResolver } from './lib/sessions.server'

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

export async function loader({ request }: LoaderFunctionArgs) {
    const { getTheme } = await themeSessionResolver(request)
    const locale = await i18nServer.getLocale(request)

    const body = JSON.stringify({ locale, theme: getTheme() })
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
    return (
        <html lang={data?.locale ?? 'en'} className={clsx(theme)}>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />
                <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
                <Links />
            </head>
            <body>
                <Outlet />
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
