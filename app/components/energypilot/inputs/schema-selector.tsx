import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useEffect, useState } from 'react'
import { InterfaceDef, InterfaceSchemaDef } from 'server/connectors/IConnector'
import { useTranslation } from 'react-i18next'

export type SchemaSelectorProps = {
    interfaceName?: string
    interfaceDef?: InterfaceDef
    onChange: (schemaName?: string) => void
}

export function SchemaSelector({
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
