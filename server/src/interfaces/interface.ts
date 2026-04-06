export abstract class IInterface {
    templateInterfaceKey: string

    constructor(templateInterfaceKey: string) {
        this.templateInterfaceKey = templateInterfaceKey
    }

    static getParametersSchema(): object {
        throw new Error('Method not implemented.')
    }

    static validateParameters(parameters: { [key: string]: string }): { [key: string]: string } {
        throw new Error('Method not implemented.')
    }

    abstract resetCache(): void
    abstract read(parameterDef: any): Promise<number | undefined>
}
