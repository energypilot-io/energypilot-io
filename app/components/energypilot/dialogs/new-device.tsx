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
import { Link, useFetcher } from '@remix-run/react'

import { useRemixForm } from 'remix-hook-form'
import { newDeviceDefaultValues, newDeviceSchema } from '~/routes/api_.devices'
import { zodResolver } from '@hookform/resolvers/zod'

import * as zod from 'zod'
import { TemplateSelector } from '../inputs/template-selector'
import { InterfaceSelector } from '../inputs/interface-selector'
import { filterObject, zodSchemaDefinitionParser } from '~/lib/utils'
import { InputArray } from '../inputs/input-array'

export function NewDeviceDialog() {
    const { t } = useTranslation()

    const [open, setOpen] = useState(false)

    const fetcher = useFetcher()

    const [backendErrorMessage, setBackendErrorMessage] = useState<string>()

    const [templateInterfaces, setTemplateInterfaces] = useState<string[]>([])

    const [additionalSchema, setAdditionalSchema] =
        useState<zod.ZodObject<any>>()

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

                let properties: string = ''
                if (
                    additionalSchema?.shape !== undefined &&
                    additionalSchema.shape !== null
                ) {
                    properties = JSON.stringify(
                        filterObject(
                            data,
                            (v, k) =>
                                Object.keys(additionalSchema?.shape).indexOf(
                                    k.toString()
                                ) > -1
                        )
                    )
                }

                const resolver = zodResolver(schemaToTest)
                return await resolver(
                    { ...data, properties: properties },
                    context,
                    options
                )
            },
            [baseSchema, additionalSchema]
        )

    useEffect(() => {
        if (fetcher.data === undefined && fetcher.data !== null) return

        const returnValues: { success?: boolean; error?: any } =
            fetcher.data as any
        if (returnValues.success !== undefined) {
            if (returnValues.success === true) {
                setOpen(false)
            }
            setBackendErrorMessage(returnValues.error)
        }
    }, [fetcher.data])

    function onOpenChange(isOpen: boolean) {
        if (isOpen) {
            setBackendErrorMessage(undefined)
            reset()
            setAdditionalSchema(undefined)
        }

        setOpen(isOpen)
    }

    function onTemplateChange(template: {
        path: string
        interfaces: string[]
    }) {
        setTemplateInterfaces(template?.interfaces)
        resetField('interface')
        setAdditionalSchema(undefined)
    }

    function onInterfaceChange(schema: {
        [fieldName: string]: { type: string }
    }) {
        setAdditionalSchema(zodSchemaDefinitionParser(schema))
    }

    const {
        formState: { errors, isValid, isSubmitting },
        handleSubmit,
        register,
        reset,
        resetField,
        control,
    } = useRemixForm<zod.infer<typeof newDeviceSchema>>({
        resolver: useDynamicZodResolver(newDeviceSchema, additionalSchema),
        fetcher: fetcher,
        submitConfig: {
            method: 'POST',
            action: '/api/devices',
        },
        defaultValues: newDeviceDefaultValues,
        shouldUnregister: true,
    })

    return (
        <fetcher.Form onSubmit={handleSubmit} id="new-device-form">
            <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Plus /> {t('dialogs.newDevice.title')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dialogs.newDevice.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('dialogs.newDevice.description')}
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

                        <TemplateSelector
                            name="template"
                            label="Template"
                            errors={errors}
                            control={control}
                            disabled={isSubmitting}
                            onChange={onTemplateChange}
                        />

                        <InterfaceSelector
                            name="interface"
                            label="Interface"
                            interfaces={templateInterfaces}
                            errors={errors}
                            control={control}
                            disabled={isSubmitting}
                            onChange={onInterfaceChange}
                        />

                        <InputArray
                            errors={errors}
                            disabled={isSubmitting}
                            register={register}
                            schema={additionalSchema}
                        />
                    </div>

                    <DialogFooter className="sm:justify-end items-center">
                        <DialogClose asChild>
                            <Link to={'#'}>{t('buttons.cancel')}</Link>
                        </DialogClose>
                        <Button
                            type="submit"
                            className="px-3"
                            form="new-device-form"
                            disabled={!isValid || isSubmitting}
                        >
                            Test & Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </fetcher.Form>
    )
}
