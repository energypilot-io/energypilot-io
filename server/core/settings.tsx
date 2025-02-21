import { Setting } from 'server/database/entities/setting.entity'
import { IFormParameterDefList } from 'server/defs/form-parameters'
import { getEntityManager } from './database'

const _registeredSettings: IFormParameterDefList = {}

export type GroupedSettingsDef = {
    [groupName: string]: IFormParameterDefList
}

export function registerSettings(settings: IFormParameterDefList) {
    Object.assign(_registeredSettings, settings)
}

export function getRegisteredSettingDefs(): GroupedSettingsDef {
    const groupedSettings: GroupedSettingsDef = {}

    Object.keys(_registeredSettings).forEach((key: string) => {
        const settingDef = _registeredSettings[key]
        const groupName = key.split('_')[0]

        if (!(groupName in groupedSettings)) {
            groupedSettings[groupName] = {}
        }
        groupedSettings[groupName][key] = settingDef
    })

    return groupedSettings
}

export async function getSetting(key: string): Promise<any | null> {
    const result = await getEntityManager().findOne(Setting, {
        key: { $eq: key },
    })

    if (
        (result === undefined || result === null) &&
        key in _registeredSettings
    ) {
        return _registeredSettings[key].defaultValue === undefined
            ? null
            : _registeredSettings[key].defaultValue
    }

    return result?.value
}

export async function getSettingAsNumber(key: string): Promise<number | null> {
    const result = await getSetting(key)

    return result !== null ? Number.parseFloat(result.toString()) : result
}
