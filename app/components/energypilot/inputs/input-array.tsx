import { useEffect, useState } from 'react'
import {
    Control,
    Controller,
    FieldErrors,
    UseFormGetValues,
    UseFormWatch,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { InterfaceDef } from 'server/interfaces/IInterface'
import * as zod from 'zod'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { filterObject, zodSchemaDefinitionParser } from '~/lib/utils'

export type InputArrayProps = {
    errors: FieldErrors<any>
    interfaceName?: string
    interfaceDef?: InterfaceDef
    disabled?: boolean
    control: Control<any>
    watch: UseFormWatch<any>
    getValues: UseFormGetValues<any>
    onPropertiesChange: (properties?: string) => void
    onSchemaChange: (newSchema?: zod.ZodObject<any>) => void
}

export function InputArray({
    errors,
    interfaceName,
    interfaceDef,
    disabled,
    control,
    watch,
    getValues,
    onPropertiesChange,
    onSchemaChange,
}: InputArrayProps) {
    const { t } = useTranslation()

    const groupNames = Object.keys(interfaceDef!)

    const schemaName = watch('schema', groupNames[0])

    const zodSchema =
        interfaceDef !== undefined && schemaName !== undefined
            ? zodSchemaDefinitionParser(interfaceDef[schemaName])
            : undefined

    const updateProperties = (data: any) => {
        let properties: string = ''
        if (zodSchema?.shape !== undefined && zodSchema.shape !== null) {
            properties = JSON.stringify({
                ...filterObject(
                    data,
                    (v, k) =>
                        Object.keys(zodSchema!.shape).indexOf(k.toString()) > -1
                ),
                schema: schemaName,
            })
        }

        console.log(properties)

        onPropertiesChange(properties)
    }

    useEffect(() => {
        onSchemaChange(zodSchema)
    }, [zodSchema])

    useEffect(() => {
        updateProperties(getValues())
    }, [schemaName])

    useEffect(() => {
        const { unsubscribe } = watch((data) => {
            updateProperties(data)
        })
        return () => unsubscribe()
    }, [watch, zodSchema])

    if (interfaceName === undefined || interfaceDef === undefined) return null

    return (
        <>
            {groupNames.length > 1 && (
                <Controller
                    control={control}
                    name="schema"
                    shouldUnregister={false}
                    disabled={disabled}
                    render={({ field: { onChange, value } }) => (
                        <ToggleGroup
                            type="single"
                            size="lg"
                            value={value}
                            variant="outline"
                            onValueChange={(value) => {
                                if (value) onChange(value)
                            }}
                            className="justify-start"
                            defaultValue={groupNames[0]}
                        >
                            {groupNames.map((groupName: any, index) => (
                                <ToggleGroupItem key={index} value={groupName}>
                                    {t(
                                        `interfaces.${interfaceName}.${groupName}.title`
                                    )}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    )}
                />
            )}

            {zodSchema?.shape !== undefined &&
                zodSchema?.shape !== null &&
                Object.keys(zodSchema?.shape).map((fieldName: string) => {
                    const field = interfaceDef![schemaName!][fieldName]

                    return (
                        <Controller
                            key={fieldName}
                            control={control}
                            name={fieldName}
                            shouldUnregister={false}
                            disabled={disabled}
                            defaultValue={field.defaultValue ?? ''}
                            render={({ field: { onChange, value } }) => (
                                <>
                                    <Label htmlFor={fieldName}>
                                        {t(
                                            `interfaces.${interfaceName}.${schemaName}.${fieldName}`
                                        )}
                                    </Label>
                                    <Input
                                        type={
                                            field.type === 'ip'
                                                ? 'text'
                                                : field.type
                                        }
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
                                            {errors[
                                                fieldName
                                            ].message?.toString()}
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
