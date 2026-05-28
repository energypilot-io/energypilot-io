export abstract class SettingChangeObserver {
    abstract getObservedSettings(): string[]

    abstract onSettingChange(name: string, value?: any): void
}
