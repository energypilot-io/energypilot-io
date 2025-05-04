import {
    index,
    layout,
    route,
    type RouteConfig,
} from '@react-router/dev/routes'

export default [
    layout('./routes/_layout.tsx', [index('./routes/_layout._index.tsx')]),
] satisfies RouteConfig
