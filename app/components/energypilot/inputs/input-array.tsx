import { Fragment, useEffect } from 'react'
import { FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { InterfaceDef, InterfaceSchemaDef } from 'server/connectors/IConnector'
import * as zod from 'zod'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { zodSchemaDefinitionParser } from '~/lib/utils'

export type InputArrayProps = {
    errors: FieldErrors<any>
    onChange: (zodSchema?: zod.ZodObject<any>) => void
    interfaceName?: string
    schemaName?: string
    interfaceDef?: InterfaceDef
    disabled?: boolean
    register?: any
}

export function InputArray({
    errors,
    register,
    schemaName,
    interfaceName,
    interfaceDef,
    disabled,
    onChange,
}: InputArrayProps) {
    const { t } = useTranslation()

    const zodSchema =
        interfaceDef !== undefined && schemaName !== undefined
            ? zodSchemaDefinitionParser(interfaceDef[schemaName])
            : undefined

    useEffect(() => {
        onChange(zodSchema)
    }, [zodSchema])

    if (zodSchema === undefined || interfaceName === undefined) return null

    return (
        <>
            {Object.keys(zodSchema?.shape).map((fieldName: any, index) => {
                const fieldDefinition = zodSchema?.shape[fieldName]
                const isNumber = fieldDefinition instanceof zod.ZodNumber

                return (
                    <Fragment key={index}>
                        <Label htmlFor={fieldName}>
                            {t(
                                `interfaces.${interfaceName}.${schemaName}.${fieldName}`
                            )}
                        </Label>
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
