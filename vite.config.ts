import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    build: {
        rollupOptions: {
            treeshake: true,
        },
    },
    plugins: [envOnlyMacros(), reactRouter(), tsconfigPaths()],
})
