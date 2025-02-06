import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useEffect, useState } from 'react'
import { InterfaceDef } from 'server/interfaces/IInterface'
import { useTranslation } from 'react-i18next'
import { Device } from 'server/database/entities/device.entity'

export type SchemaSelectorProps = {
    device?: Device
    interfaceName?: string
    interfaceDef?: InterfaceDef
    onChange: (schemaName?: string) => void
}

export function SchemaSelector({
    device,
    interfaceName,
    interfaceDef,
    onChange,
}: SchemaSelectorProps) {
    const { t } = useTranslation()

    const [value, setValue] = useState<string>()

    useEffect(() => {
        if (value === undefined || interfaceDef === undefined) {
            onChange(undefined)
        } else {
            onChange(value)
        }
    }, [value, interfaceDef])

    useEffect(() => {
        if (interfaceDef === undefined) {
            setValue(undefined)
        } else {
            setValue(Object.keys(interfaceDef)[0])
        }
    }, [interfaceDef])

    useEffect(() => {
        if (device === undefined) return

        const schema = JSON.parse(device.properties)['schema']
        onChange(schema)

        console.log(schema)
    }, [device, onChange])

    if (interfaceDef === undefined) {
        return null
    }

    const groupNames = Object.keys(interfaceDef)

    if (groupNames.length === 1) {
        return null
    }

    return (
        <ToggleGroup
            type="single"
            size="lg"
            value={value}
            variant="outline"
            onValueChange={setValue}
            className="justify-start"
            defaultValue={groupNames[0]}
        >
            {groupNames.map((groupName: any, index) => (
                <ToggleGroupItem key={index} value={groupName}>
                    {t(`interfaces.${interfaceName}.${groupName}.title`)}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}
