import {
    index,
    layout,
    route,
    type RouteConfig,
} from '@react-router/dev/routes'

export default [
    layout('./routes/_layout.tsx', [
        index('./routes/pages/_index.tsx'),
        route('/graph', './routes/pages/graph.tsx'),
        route('/settings/common', './routes/pages/settings/common.tsx'),
        route('/settings/dashboard', './routes/pages/settings/dashboard.tsx'),
        route('/settings/devices', './routes/pages/settings/devices.tsx'),
    ]),

    route('/api/locales', './routes/api/locales.tsx'),
    route('/api/settings', './routes/api/settings.tsx'),
    route('/action/set-theme', './routes/api/set-theme.tsx'),
    route('/api/snapshots', './routes/api/snapshots.tsx'),
    route('/api/template-registry', './routes/api/template-registry.tsx'),

    route('/api/devices', './routes/api/devices/_index.tsx'),
    route('/api/devices/:deviceId', './routes/api/devices/device.tsx'),

    route('/api/energy-export/:timestamp', './routes/api/energy-export.tsx'),
    route('/api/energy-import/:timestamp', './routes/api/energy-import.tsx'),
    route(
        '/api/energy-production/:timestamp',
        './routes/api/energy-production.tsx'
    ),

    route(
        '/.well-known/appspecific/com.chrome.devtools.json',
        './routes/debug.null.tsx'
    ),
] satisfies RouteConfig
