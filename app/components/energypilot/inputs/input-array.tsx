import { Fragment, useEffect } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { InterfaceDef, InterfaceSchemaDef } from 'server/interfaces/IInterface'
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
    control: Control<any>
}

export function InputArray({
    errors,
    schemaName,
    interfaceName,
    interfaceDef,
    disabled,
    control,
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
            {Object.keys(zodSchema?.shape).map((fieldName: string) => {
                const field = interfaceDef![schemaName!][fieldName]

                return (
                    <Controller
                        key={fieldName}
                        control={control}
                        name={fieldName}
                        shouldUnregister={true}
                        disabled={disabled}
                        defaultValue={
                            interfaceDef![schemaName!][fieldName]
                                .defaultValue ?? ''
                        }
                        render={({ field: { onChange, value } }) => (
                            <>
                                <Label htmlFor={fieldName}>
                                    {t(
                                        `interfaces.${interfaceName}.${schemaName}.${fieldName}`
                                    )}
                                </Label>
                                <Input
                                    type={field.type}
                                    value={value}
                                    onChange={(event) =>
                                        onChange?.(
                                            field.type === 'number'
                                                ? parseInt(
                                                      event.target.value,
                                                      10
                                                  )
                                                : event.target.value
                                        )
                                    }
                                />
                                {errors[fieldName] && (
                                    <p className="text-sm text-red-600">
                                        {errors[fieldName].message?.toString()}
                                    </p>
                                )}
                            </>
                        )}
                    />
                )
            })}
        </>
    )
}
