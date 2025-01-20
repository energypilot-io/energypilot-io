import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Link, useFetcher } from '@remix-run/react'

import * as zod from 'zod'
import { useRemixForm } from 'remix-hook-form'
import {
    newDeviceDefaultValues,
    newDeviceSchema,
    newDeviceSchemaResolver,
} from '~/routes/api_.devices'
import { Controller } from 'react-hook-form'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { SelectLabel } from '@radix-ui/react-select'
import { templates } from 'server/core/template-manager'

export function NewDeviceDialog() {
    const { t } = useTranslation()

    const [open, setOpen] = useState(false)
    const fetcher = useFetcher()

    const [backendErrorMessage, setBackendErrorMessage] = useState<string>()

    const [availableTemplates, setAvailableTemplates] =
        useState<templates.AvailableTemplates>()

    const [templateInterfaces, setTemplateInterfaces] = useState<string[]>([])

    useEffect(() => {
        fetcher.load('/api/templates')
    }, [])

    useEffect(() => {
        if (fetcher.data === undefined && fetcher.data !== null) return

        const returnValues: { success?: boolean; error?: any } =
            fetcher.data as any
        if (returnValues.success !== undefined) {
            if (returnValues.success === true) {
                setOpen(false)
            }
            setBackendErrorMessage(returnValues.error)

            return
        }

        setAvailableTemplates(fetcher.data as templates.AvailableTemplates)
    }, [fetcher.data])

    function onOpenChange(isOpen: boolean) {
        if (isOpen) {
            setBackendErrorMessage(undefined)
            reset()
        }

        setOpen(isOpen)
    }

    function onTemplateTypeChange(
        value: string,
        callback: (value: string) => void
    ) {
        callback(value)

        if (availableTemplates === undefined) return

        const templateTokens = value.split(':')
        setTemplateInterfaces(
            availableTemplates[templateTokens[0]][templateTokens[1]].interfaces
        )
    }

    const {
        formState: { errors },
        handleSubmit,
        register,
        reset,
        control,
    } = useRemixForm<zod.infer<typeof newDeviceSchema>>({
        resolver: newDeviceSchemaResolver,
        fetcher: fetcher,
        submitConfig: {
            method: 'POST',
            action: '/api/devices',
        },
        defaultValues: newDeviceDefaultValues,
    })

    const templateSelectorGroups =
        availableTemplates !== undefined
            ? Object.keys(availableTemplates).map((type) => {
                  return {
                      groupLabel: t(`consts.templateTypes.${type}`),
                      items: Object.keys(availableTemplates[type]).map(
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

    return (
        <fetcher.Form onSubmit={handleSubmit} id="new-device-form">
            <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Plus /> {t('dialogs.newDevice.title')}
                    </Button>
                </DialogTrigger>
                <DialogOverlay />
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
                        <Input {...register('name')} id="name" required />
                        {errors.name && (
                            <p className="text-sm text-red-600">
                                {errors.name.message}
                            </p>
                        )}

                        <Label htmlFor="template">Template</Label>
                        <Controller
                            control={control}
                            name="template"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    onValueChange={(value) =>
                                        onTemplateTypeChange(value, onChange)
                                    }
                                    value={value}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a device template" />
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
                                {errors.template.message}
                            </p>
                        )}

                        <Label htmlFor="interface">Template</Label>
                        <Controller
                            control={control}
                            name="interface"
                            render={({ field: { onChange, value } }) => (
                                <Select onValueChange={onChange} value={value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select the device interface" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templateInterfaces.map(
                                            (value, index) => (
                                                <SelectItem
                                                    value={value}
                                                    key={index}
                                                >
                                                    {value}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.template && (
                            <p className="text-sm text-red-600">
                                {errors.template.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-end items-center">
                        <DialogClose asChild>
                            <Link to={'#'}>{t('buttons.cancel')}</Link>
                        </DialogClose>
                        <Button
                            type="submit"
                            className="px-3"
                            form="new-device-form"
                            disabled={fetcher.state !== 'idle'}
                        >
                            Test & Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </fetcher.Form>
    )
}
