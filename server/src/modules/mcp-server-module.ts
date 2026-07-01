import { SettingChangeObserver } from '@/observers/setting-change-observer.js'
import { ModuleBase } from './module-base.js'

export class MCPServerModule
    extends ModuleBase
    implements SettingChangeObserver
{
    static MODULE_NAME = 'mcp_server'

    constructor() {
        super(MCPServerModule.MODULE_NAME)
    }

    getModuleName(): string {
        return MCPServerModule.MODULE_NAME
    }

    start(): void {}

    stop(): void {}
}
