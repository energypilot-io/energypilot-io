import { SelectProps } from '@radix-ui/react-select'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { InterfaceDef } from 'server/interfaces/IInterface'
import { Label } from '~/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'

export type InterfaceSelectorProps = SelectProps & {
    name: string
    label: string
    interfaces: string[]
    errors: FieldErrors<any>
    control?: Control<any>
    onChange?: (interfaceName: string, interfaceDef: InterfaceDef) => void
}

export function InterfaceSelector({
    name,
    label,
    errors,
    interfaces,
    control,
    onChange,
    ...rest
}: InterfaceSelectorProps) {
    const fetcher = useFetcher()

    const [value, setValue] = useState<string>()

    useEffect(() => {
        if (fetcher.data === undefined || fetcher.data === null) return

        if (onChange !== undefined) {
            onChange(value!, fetcher.data as InterfaceDef)
        }
    }, [fetcher.data])

    function onHandleChange(value: string, callback: (value: string) => void) {
        callback(value)
        setValue(value)

        if (value !== undefined) {
            fetcher.load(`/api/interfaces/${value}`)
        }
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
                            <SelectValue placeholder="Select the device interface" />
                        </SelectTrigger>
                        <SelectContent>
                            {interfaces.map((value, index) => (
                                <SelectItem value={value} key={index}>
                                    {value}
                                </SelectItem>
                            ))}
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
