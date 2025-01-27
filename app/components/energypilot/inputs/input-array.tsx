import { Fragment, useEffect } from 'react'
import {
    Control,
    FieldErrors,
    RegisterOptions,
    useFieldArray,
} from 'react-hook-form'
import * as zod from 'zod'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export type InputArrayProps = {
    errors: FieldErrors<any>
    schema?: zod.ZodObject<any>
    disabled?: boolean
    register?: any
}

export function InputArray({
    errors,
    register,
    schema,
    disabled,
}: InputArrayProps) {
    if (schema?.shape === undefined || schema.shape === null) return null

    return (
        <>
            {Object.keys(schema?.shape).map((fieldName: any, index) => {
                const fieldDefinition = schema.shape[fieldName]
                const isNumber = fieldDefinition instanceof zod.ZodNumber

                return (
                    <Fragment key={index}>
                        <Label htmlFor={fieldName}>{fieldName}</Label>
                        <Input
                            id={fieldName}
                            readOnly={disabled}
                            type={isNumber ? 'number' : 'text'}
                            {...register(fieldName, {
                                valueAsNumber: isNumber,
                            })}
                        />
                        {errors[fieldName] && (
                            <p className="text-sm text-red-600">
                                {errors[fieldName].message?.toString()}
                            </p>
                        )}
                    </Fragment>
                )
            })}
        </>
    )
}
