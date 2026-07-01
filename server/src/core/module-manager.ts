import { ModuleBase } from '@/modules/module-base.js'
import { RegisteredModules } from './config.js'

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

export function isModuleActive(moduleName: string): boolean {
    return _moduleInstances.some(
        module => module.getModuleName() === moduleName && module.getIsEnabled()
    )
}
