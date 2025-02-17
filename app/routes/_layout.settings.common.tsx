import { LoaderFunctionArgs } from '@remix-run/node'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { LoaderIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fragment } from 'react/jsx-runtime'
import { useRemixForm } from 'remix-hook-form'
import { settings } from 'server/core/settings'
import { Header } from '~/components/energypilot/site/header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import * as zod from 'zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { zodSchemaDefinitionParser } from '~/lib/utils'
import { IFormParameterDefList } from 'server/defs/form-parameters'
import { Controller } from 'react-hook-form'
import { useToast } from '~/hooks/use-toast'
import { Toaster } from '~/components/ui/toaster'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'

export const loader = async ({ context }: LoaderFunctionArgs) => {
    return context.settings as settings.GroupedSettingsDef
}

export default function SettingsCommonPage() {
    const { t } = useTranslation()

    const { toast } = useToast()

    const [backendErrorMessage, setBackendErrorMessage] = useState<string>()
    const data = useLoaderData<typeof loader>()

    const formFetcher = useFetcher()
    const settingsFetcher = useFetcher()

    const formParameterList = useMemo(
        () =>
            Object.assign(
                {},
                ...Object.keys(data).map((groupName) => data[groupName])
            ) as IFormParameterDefList,
        [data]
    )

    const useDynamicZodResolver = (
        groupedSettings: settings.GroupedSettingsDef
    ) =>
        useCallback(
            async (data: any, context: any, options: any) => {
                const schema = zodSchemaDefinitionParser(formParameterList)

                const resolver = zodResolver(
                    schema !== undefined ? schema : zod.object({})
                )
                return await resolver({ ...data }, context, options)
            },
            [groupedSettings]
        )

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        control,
        setValue,
    } = useRemixForm<zod.infer<any>>({
        resolver: useDynamicZodResolver(data),
        fetcher: formFetcher,
        submitConfig: {
            method: 'POST',
            action: '/api/settings',
        },
        shouldUnregister: false,
    })

    useEffect(() => {
        settingsFetcher.load('/api/settings')
    }, [])

    useEffect(() => {
        if (!Array.isArray(settingsFetcher.data) || data == undefined) return
        ;(settingsFetcher.data as any[]).forEach((setting) => {
            if (formParameterList[setting.key].type === 'number') {
                setValue(setting.key, Number.parseFloat(setting.value))
            } else {
                setValue(setting.key, setting.value)
            }
        })
    }, [settingsFetcher.data, formParameterList])

    useEffect(() => {
        if (formFetcher.data === undefined && formFetcher.data !== null) return

        const returnValues: { success?: boolean; error?: any } =
            formFetcher.data as any

        if (returnValues.success !== undefined) {
            if (returnValues.success === true) {
                toast({
                    variant: 'success',
                    title: 'Settings saved!',
                })
            }
            setBackendErrorMessage(returnValues.error)
        }
    }, [formFetcher.data])

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: t('navigation.pages.settings.title'), link: '#' },
                    {
                        label: t('navigation.pages.settings.common.title'),
                        link: '#',
                    },
                ]}
            />

            <Toaster />

            <formFetcher.Form onSubmit={handleSubmit}>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {backendErrorMessage && (
                        <div className="text-sm text-red-600">
                            {backendErrorMessage}
                        </div>
                    )}

                    {data === undefined ? (
                        <LoaderIcon className="animate-spin" size={64} />
                    ) : (
                        <>
                            {Object.keys(data).map((groupName, index) => (
                                <Fragment key={index}>
                                    <div className="flex flex-col gap-2">
                                        <p className="font-bold">
                                            {t(`settings.${groupName}.label`)}
                                        </p>
                                        <p className="text-sm">
                                            {t(
                                                `settings.${groupName}.description`
                                            )}
                                        </p>
                                    </div>

                                    {Object.keys(data[groupName]).map(
                                        (key: string, index) => {
                                            const parameter =
                                                data[groupName][key]

                                            const parameterName: string =
                                                key.substring(
                                                    key.indexOf('_') + 1
                                                )

                                            return (
                                                <div
                                                    className="flex flex-col gap-1"
                                                    key={index}
                                                >
                                                    <Label htmlFor={key}>
                                                        {t(
                                                            `settings.${groupName}.${parameterName}.label`
                                                        )}
                                                    </Label>
                                                    <p className="text-sm">
                                                        {t(
                                                            `settings.${groupName}.${parameterName}.description`
                                                        )}
                                                    </p>

                                                    <Controller
                                                        control={control}
                                                        name={key}
                                                        shouldUnregister={false}
                                                        disabled={isSubmitting}
                                                        defaultValue={
                                                            parameter.defaultValue ??
                                                            ''
                                                        }
                                                        render={({
                                                            field: {
                                                                onChange,
                                                                value,
                                                            },
                                                        }) => {
                                                            if (
                                                                parameter.type ===
                                                                'enum'
                                                            ) {
                                                                return (
                                                                    <Select
                                                                        onValueChange={
                                                                            onChange
                                                                        }
                                                                        value={
                                                                            value
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="max-w-72">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {parameter.enumValues?.map(
                                                                                (
                                                                                    enumValue: string,
                                                                                    index
                                                                                ) => (
                                                                                    <SelectItem
                                                                                        value={
                                                                                            enumValue
                                                                                        }
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                    >
                                                                                        {t(
                                                                                            `settings.${groupName}.${parameterName}.values.${enumValue}`,
                                                                                            {
                                                                                                defaultValue:
                                                                                                    enumValue,
                                                                                            }
                                                                                        )}
                                                                                    </SelectItem>
                                                                                )
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )
                                                            } else {
                                                                return (
                                                                    <div className="flex">
                                                                        <Input
                                                                            id={
                                                                                key
                                                                            }
                                                                            type={
                                                                                parameter.type ===
                                                                                'ip'
                                                                                    ? 'text'
                                                                                    : parameter.type
                                                                            }
                                                                            className={`max-w-72 ${
                                                                                parameter.unit !==
                                                                                undefined
                                                                                    ? 'rounded-r-none'
                                                                                    : ''
                                                                            }`}
                                                                            value={
                                                                                value
                                                                            }
                                                                            min={
                                                                                parameter.min
                                                                            }
                                                                            max={
                                                                                parameter.max
                                                                            }
                                                                            onChange={(
                                                                                event
                                                                            ) =>
                                                                                onChange?.(
                                                                                    parameter.type ===
                                                                                        'number' &&
                                                                                        event
                                                                                            .target
                                                                                            .value !==
                                                                                            ''
                                                                                        ? parseInt(
                                                                                              event
                                                                                                  .target
                                                                                                  .value,
                                                                                              10
                                                                                          )
                                                                                        : event
                                                                                              .target
                                                                                              .value
                                                                                )
                                                                            }
                                                                        />

                                                                        {parameter.unit && (
                                                                            <div className="flex items-center justify-center px-3 border border-r-0 rounded-r bg-gray-300">
                                                                                {
                                                                                    parameter.unit
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            }
                                                        }}
                                                    />

                                                    {errors[key] && (
                                                        <p className="text-sm text-red-600">
                                                            {errors[
                                                                key
                                                            ]!.message?.toString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        }
                                    )}
                                </Fragment>
                            ))}

                            <div>
                                <Button
                                    className="px-3"
                                    form="new-device-form"
                                    disabled={isSubmitting}
                                    onClick={() => handleSubmit()}
                                >
                                    Save Settings
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </formFetcher.Form>
        </>
    )
}
