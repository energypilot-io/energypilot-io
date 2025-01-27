import { SelectProps } from '@radix-ui/react-select'
import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'
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
    onChange?: (schema: { [fieldName: string]: { type: string } }) => void
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

    useEffect(() => {
        if (fetcher.data === undefined || fetcher.data === null) return

        if (onChange !== undefined) {
            onChange(fetcher.data as { [fieldName: string]: { type: string } })
        }
    }, [fetcher.data])

    function onHandleChange(value: string, callback: (value: string) => void) {
        callback(value)

        if (value !== undefined) {
            fetcher.load(`/api/interfaces/${value}/parameters`)
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
