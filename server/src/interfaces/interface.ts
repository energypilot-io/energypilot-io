import { ParameterDef } from '@/defs/device-template'

export abstract class IInterface {
    templateInterfaceKey: string

    constructor(templateInterfaceKey: string) {
        this.templateInterfaceKey = templateInterfaceKey
    }

    static getParametersSchema(): object {
        throw new Error('Method not implemented.')
    }

    abstract resetCache(): void
    abstract read(parameterDef: ParameterDef): Promise<number | undefined>
}
