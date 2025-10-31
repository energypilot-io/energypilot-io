import {
    ModifierDef,
    ParameterDef,
    StaticValueDef,
} from '@/defs/device-template'
import { IInterface } from '@/interfaces/interface'

export interface IParameter {
    getValue: () => Promise<number | undefined>
}

export class Modifier implements IParameter {
    private _modifier: 'add' | 'sub' | 'mul' | 'div' | 'bool'
    private _values: IParameter[] = []
    private _scale?: number

    constructor(modifierDef: ModifierDef, connector: IInterface) {
        this._modifier = modifierDef.modifier
        this._scale = modifierDef.scale

        modifierDef.values.forEach((value) => {
            this._values.push(parseParameter(value, connector))
        })
    }

    public async getValue() {
        if (this._values.length === 0) return undefined

        let result: number | undefined = await this._values[0].getValue()

        if (result !== undefined) {
            for (
                let valueIndex = 1;
                valueIndex < this._values.length;
                valueIndex++
            ) {
                const currentValue = await this._values[valueIndex].getValue()

                if (currentValue === undefined) {
                    return undefined
                }

                switch (this._modifier) {
                    case 'add':
                        result! += currentValue
                        break

                    case 'sub':
                        result! -= currentValue
                        break

                    case 'mul':
                        result! *= currentValue
                        break

                    case 'div':
                        result! /= currentValue
                        break
                }
            }

            if (this._scale !== undefined) {
                result *= this._scale
            }

            if (this._modifier === 'bool') {
                result = result > 0 ? 1 : 0
            }
        }

        return result
    }
}

export class StaticValue implements IParameter {
    private _value: number

    constructor(staticValueDef: StaticValueDef) {
        this._value = staticValueDef.staticValue
    }

    public async getValue() {
        return this._value
    }
}

export class Parameter implements IParameter {
    private _connector: IInterface
    private _parameterDef: ParameterDef

    constructor(parameterDef: ParameterDef, connector: IInterface) {
        this._parameterDef = parameterDef
        this._connector = connector
    }

    public async getValue() {
        const value = await this._connector.read(this._parameterDef)
        return value
    }
}

export function parseParameter(
    parameterDef: ModifierDef | ParameterDef | StaticValueDef,
    connector: IInterface
) {
    if ('modifier' in parameterDef) {
        return new Modifier(parameterDef, connector)
    } else if ('staticValue' in parameterDef) {
        return new StaticValue(parameterDef)
    } else {
        return new Parameter(parameterDef, connector)
    }
}
