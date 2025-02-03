import { IInterface } from 'server/interfaces/IInterface'
import { ModifierDef, ParameterDef, StaticValueDef } from 'server/defs/template'

export interface IParameter {
    getValue: () => Promise<number | undefined>
}

export class Modifier implements IParameter {
    private _modifier: 'add' | 'sub' | 'mul' | 'div'
    private _values: IParameter[] = []

    constructor(modifierDef: ModifierDef, connector: IInterface) {
        this._modifier = modifierDef.modifier

        modifierDef.values.forEach((value) => {
            this._values.push(parseParameter(value, connector))
        })
    }

    public async getValue() {
        if (this._values.length === 0) return undefined
        if (this._values.length === 1) return await this._values[0].getValue()

        let result: number | undefined = await this._values[0].getValue()

        if (result === undefined) return result

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
