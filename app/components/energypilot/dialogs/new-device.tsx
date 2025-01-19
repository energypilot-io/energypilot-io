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

export function NewDeviceDialog() {
    const { t } = useTranslation()

    const [open, setOpen] = useState(false)
    const fetcher = useFetcher()

    useEffect(() => {
        if (fetcher.data === undefined && fetcher.data !== null) return

        const returnValues: { success?: boolean } = fetcher.data as any

        if (returnValues.success === true) {
            setOpen(false)
        }
    }, [fetcher.data])

    const {
        formState: { errors },
        handleSubmit,
        register,
        reset,
    } = useRemixForm<zod.infer<typeof newDeviceSchema>>({
        resolver: newDeviceSchemaResolver,
        fetcher: fetcher,
        submitConfig: {
            method: 'POST',
            action: '/api/devices',
        },
        defaultValues: newDeviceDefaultValues,
    })

    function onOpenChange(isOpen: boolean) {
        if (isOpen) {
            reset()
        }

        setOpen(isOpen)
    }

    return (
        <fetcher.Form onSubmit={handleSubmit} id="new-device-form">
            <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Plus /> {t('dialogs.newDevice.title')}
                    </Button>
                </DialogTrigger>
                <DialogOverlay />
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dialogs.newDevice.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('dialogs.newDevice.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input {...register('name')} id="name" required />
                            {errors.name && (
                                <p className="text-sm text-red-600">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-end items-center">
                        <DialogClose asChild>
                            <Link to={'#'}>Close</Link>
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
