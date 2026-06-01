import { ModuleBase } from '@/modules/module.base'
import { RegisteredModules } from './config'

let _moduleInstances: ModuleBase[] = []

export async function initModuleManager() {
    RegisteredModules.forEach(module => {
        const instance = new (module as any)()
        _moduleInstances.push(instance)
    })
}

export function getActiveModules(): string[] {
    return _moduleInstances
        .filter(module => module.getIsEnabled())
        .map(module => module.getModuleName())
}
