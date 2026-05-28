export abstract class ModuleBase {
    static getSettings(): any {
        throw new Error('Method not implemented! Use derived class')
    }
}
