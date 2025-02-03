import { SelectProps } from '@radix-ui/react-select'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { templates } from 'server/core/template-manager'
import { TemplateDef } from 'server/defs/template'
import { Label } from '~/components/ui/label'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'

export type TemplateSelectorProps = SelectProps & {
    name: string
    label: string
    errors: FieldErrors<any>
    control?: Control<any>
    onChange?: (template: TemplateDef) => void
}

export function TemplateSelector({
    name,
    label,
    control,
    errors,
    onChange: onChangeCallback,
    ...rest
}: TemplateSelectorProps) {
    const { t } = useTranslation()
    const fetcher = useFetcher()

    const [templates, setTemplates] = useState<templates.TemplateRegistry>()

    useEffect(() => {
        fetcher.load('/api/templates')
    }, [])

    useEffect(() => {
        if (fetcher.data === undefined && fetcher.data !== null) return

        setTemplates(fetcher.data as templates.TemplateRegistry)
    }, [fetcher.data])

    const templateSelectorGroups =
        templates !== undefined
            ? Object.keys(templates).map((type) => {
                  return {
                      groupLabel: t(`consts.templateTypes.${type}`),
                      items: Object.keys(templates[type]).map((item) => {
                          return {
                              value: `${type}:${item}`,
                              label: item,
                          }
                      }),
                  }
              })
            : []

    function onHandleChange(value: string, callback: (value: string) => void) {
        if (onChangeCallback !== undefined && templates !== undefined) {
            const templateTokens = value.split(':')
            onChangeCallback(templates[templateTokens[0]][templateTokens[1]])
        }

        callback(value)
    }

    return (
        <>
            <Label htmlFor={name}>{label}</Label>
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, value } }) => (
                    <Select
                        {...rest}
                        onValueChange={(value) =>
                            onHandleChange(value, onChange)
                        }
                        value={value}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a device template" />
                        </SelectTrigger>
                        <SelectContent>
                            {templateSelectorGroups.map((group, groupIndex) => {
                                return (
                                    <SelectGroup key={groupIndex}>
                                        <SelectLabel>
                                            {group.groupLabel}
                                        </SelectLabel>
                                        {group.items.map((item, itemIndex) => (
                                            <SelectItem
                                                value={item.value}
                                                key={itemIndex}
                                            >
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )
                            })}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors[name] && (
                <p className="text-sm text-red-600">
                    {errors[name].message?.toString()}
                </p>
            )}
        </>
    )
}
