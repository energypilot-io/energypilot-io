import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Link, useFetcher } from 'react-router';

import { useRemixForm } from 'remix-hook-form'
import { newDeviceSchema } from '~/routes/api_.devices'
import { zodResolver } from '@hookform/resolvers/zod'

import * as zod from 'zod'
import { InputArray } from '../inputs/input-array'
import { InterfaceDef } from 'server/interfaces/IInterface'
import { Card, CardContent } from '~/components/ui/card'
import { Device } from 'server/database/entities/device.entity'
import { Controller } from 'react-hook-form'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'

type TemplateRegistry = {
    interfaces: { [interfaceName: string]: InterfaceDef }
    templates: {
        [templateType: string]: {
            [templateName: string]: { interfaces: string[] }
        }
    }
}

export type NewDeviceDialogProps = {
    device?: Device
}

export function UpsertDeviceDialog({ device }: NewDeviceDialogProps) {
    const { t } = useTranslation()

    const [open, setOpen] = useState(false)

    const formFetcher = useFetcher()
    const templateRegistryFetcher = useFetcher()

    const [backendErrorMessage, setBackendErrorMessage] = useState<string>()

    const [templateRegistry, setTemplateRegistry] = useState<TemplateRegistry>()

    const [deviceProperties, setDeviceProperties] = useState<
        string | undefined
    >(undefined)

    const useDynamicZodResolver = (
        baseSchema: zod.ZodObject<any>,
        additionalSchema: zod.ZodObject<any> | undefined
    ) =>
        useCallback(
            async (data: any, context: any, options: any) => {
                const schemaToTest =
                    additionalSchema !== undefined
                        ? baseSchema.merge(additionalSchema)
                        : baseSchema

                const resolver = zodResolver(schemaToTest)
                return await resolver(
                    { ...data, properties: deviceProperties, id: device?.id },
                    context,
                    options
                )
            },
            [baseSchema, additionalSchema, deviceProperties]
        )

    const [additionalSchema, setAdditionalSchema] =
        useState<zod.ZodObject<any>>()

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        resetField,
        getValues,
        control,
    } = useRemixForm<zod.infer<typeof newDeviceSchema>>({
        resolver: useDynamicZodResolver(newDeviceSchema, additionalSchema),
        fetcher: formFetcher,
        submitConfig: {
            method: 'POST',
            action: '/api/devices',
        },
        shouldUnregister: false,
    })

    const [selectedTemplate, selectedInterface] = watch([
        'template',
        'interface',
    ])

    useEffect(() => {
        const { unsubscribe } = watch((data, { name }) => {
            switch (name) {
                case 'template':
                    resetField('interface', { defaultValue: '' })
                case 'interface':
                    setDeviceProperties(undefined)
                default:
                    break
            }
        })
        return () => unsubscribe()
    }, [watch])

    useEffect(() => {
        templateRegistryFetcher.load('/api/template-registry')
    }, [])

    useEffect(() => {
        if (
            templateRegistryFetcher.data === undefined &&
            templateRegistryFetcher.data !== null
        )
            return

        setTemplateRegistry(templateRegistryFetcher.data as TemplateRegistry)
    }, [templateRegistryFetcher.data])

    useEffect(() => {
        if (formFetcher.data === undefined && formFetcher.data !== null) return

        const returnValues: { success?: boolean; error?: any } =
            formFetcher.data as any
        if (returnValues.success !== undefined) {
            if (returnValues.success === true) {
                setOpen(false)
            }
            setBackendErrorMessage(returnValues.error)
        }
    }, [formFetcher.data])

    function onOpenChange(isOpen: boolean) {
        if (isOpen) {
            setBackendErrorMessage(undefined)
            reset()

            if (device !== undefined) {
                setValue('name', device.name)
                setValue('template', `${device.type}:${device.template}`)
                setValue('interface', device.interface)

                const parsedProperties = JSON.parse(device.properties)
                Object.keys(parsedProperties).forEach((propertyName) => {
                    console.log(propertyName, parsedProperties[propertyName])
                    // @ts-ignore
                    setValue(propertyName, parsedProperties[propertyName])
                })
            }
        }

        setOpen(isOpen)
    }

    const templateSelectorGroups =
        templateRegistry !== undefined
            ? Object.keys(templateRegistry.templates).map((type) => {
                  return {
                      groupLabel: t(`consts.templateTypes.${type}`),
                      items: Object.keys(templateRegistry.templates[type]).map(
                          (item) => {
                              return {
                                  value: `${type}:${item}`,
                                  label: item,
                              }
                          }
                      ),
                  }
              })
            : []

    const interfaceSelectorGroups = () => {
        if (
            templateRegistry === undefined ||
            selectedTemplate === undefined ||
            selectedTemplate === ''
        )
            return []

        const templateTokens = selectedTemplate.split(':')
        return templateRegistry.templates[templateTokens[0]][templateTokens[1]]
            .interfaces
    }

    const interfaceDef = () => {
        if (
            templateRegistry === undefined ||
            selectedTemplate === undefined ||
            selectedInterface === undefined
        )
            return undefined

        return templateRegistry.interfaces[selectedInterface]
    }

    const translationKey = device === undefined ? 'create' : 'update'

    if (templateRegistry === undefined) return null

    return (
        <formFetcher.Form onSubmit={handleSubmit}>
            <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
                <DialogTrigger asChild>
                    {device === undefined ? (
                        <Button variant="outline">
                            <Plus /> {t('consts.buttons.create')}
                        </Button>
                    ) : (
                        <Button>{t('consts.buttons.edit')}</Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t(`dialogs.upsertDevice.${translationKey}.title`)}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                `dialogs.upsertDevice.${translationKey}.description`
                            )}
                        </DialogDescription>
                        {backendErrorMessage && (
                            <DialogDescription className="text-sm text-red-600">
                                {backendErrorMessage}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            {...register('name')}
                            id="name"
                            required
                            readOnly={isSubmitting}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-600">
                                {errors.name.message}
                            </p>
                        )}

                        <Label htmlFor="template">Template</Label>
                        <Controller
                            control={control}
                            name="template"
                            disabled={isSubmitting}
                            render={({ field: { onChange, value } }) => (
                                <Select onValueChange={onChange} value={value}>
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t(
                                                `dialogs.upsertDevice.selectTemplatePlaceholder`
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templateSelectorGroups.map(
                                            (group, groupIndex) => {
                                                return (
                                                    <SelectGroup
                                                        key={groupIndex}
                                                    >
                                                        <SelectLabel>
                                                            {group.groupLabel}
                                                        </SelectLabel>
                                                        {group.items.map(
                                                            (
                                                                item,
                                                                itemIndex
                                                            ) => (
                                                                <SelectItem
                                                                    value={
                                                                        item.value
                                                                    }
                                                                    key={
                                                                        itemIndex
                                                                    }
                                                                >
                                                                    {item.label}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectGroup>
                                                )
                                            }
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.template && (
                            <p className="text-sm text-red-600">
                                {errors.template.message?.toString()}
                            </p>
                        )}

                        <Label htmlFor="interface">Interface</Label>
                        <Controller
                            control={control}
                            name="interface"
                            disabled={isSubmitting}
                            render={({ field: { onChange, value } }) => (
                                <Select onValueChange={onChange} value={value}>
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t(
                                                `dialogs.upsertDevice.selectInterfacePlaceholder`
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {interfaceSelectorGroups().map(
                                            (interaceName, index) => (
                                                <SelectItem
                                                    value={interaceName}
                                                    key={index}
                                                >
                                                    {interaceName}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.interface && (
                            <p className="text-sm text-red-600">
                                {errors.interface.message?.toString()}
                            </p>
                        )}

                        {selectedInterface !== undefined &&
                            selectedInterface !== '' && (
                                <Card>
                                    <CardContent className="p-4">
                                        <InputArray
                                            errors={errors}
                                            disabled={isSubmitting}
                                            control={control}
                                            interfaceName={selectedInterface}
                                            interfaceDef={interfaceDef()}
                                            watch={watch}
                                            getValues={getValues}
                                            onPropertiesChange={
                                                setDeviceProperties
                                            }
                                            onSchemaChange={setAdditionalSchema}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                    </div>

                    <DialogFooter className="sm:justify-end items-center">
                        <DialogClose asChild>
                            <Link to={'#'}>{t('consts.buttons.cancel')}</Link>
                        </DialogClose>
                        <Button
                            className="px-3"
                            form="new-device-form"
                            disabled={isSubmitting}
                            onClick={() => handleSubmit()}
                        >
                            {device !== undefined
                                ? t('consts.buttons.update')
                                : t('consts.buttons.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </formFetcher.Form>
    )
}
