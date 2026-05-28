import { RegisteredModules } from './config'

export async function initModuleManager() {
    RegisteredModules.forEach(module => {
        new (module as any)()
    })
}
