import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { parseFormData } from 'remix-hook-form'
import { GroupedSettingsDef } from 'server/core/settings'
import { Setting } from 'server/database/entities/setting.entity'
import { getEntityManager } from '~/lib/db.server'
import i18next from '~/lib/i18n.server'

export async function action({ request }: ActionFunctionArgs) {
    const formData = await parseFormData(request)

    try {
        if (formData !== undefined && formData !== null) {
            Object.keys(formData as { [key: string]: any }).forEach(
                async (key: string) => {
                    // @ts-ignore
                    const value = formData[key]

                    const em = await getEntityManager()
                    const setting = em.create(Setting, {
                        created_at: new Date(),
                        key: key,
                        value: value,
                    })

                    await em.upsert(setting)
                }
            )
        }

        return {
            success: true,
            defaultValues: formData,
        }
    } catch (error) {
        let t = await i18next.getFixedT(request)

        let errorMessage: string = t('messages.errors.db.cannotCreateSetting')

        return { success: false, error: errorMessage }
    }
}

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')

    if (query !== null) {
        const settingEntity = await getEntityManager().findOne(
            Setting,
            {
                key: { $in: [query.toString()] },
            },
            {}
        )
        return settingEntity
    }

    if (url.searchParams.get('groupedDefs') !== null) {
        const groupedSettings = context.settings as GroupedSettingsDef

        if (groupedSettings === undefined || groupedSettings === null)
            return null

        const settingKeys: string[] = Object.keys(groupedSettings).reduce(
            (accumulator: string[], currentValue: string) =>
                accumulator.concat(Object.keys(groupedSettings[currentValue])),
            []
        )

        const settingEntities = await getEntityManager().find(
            Setting,
            {
                key: { $in: settingKeys },
            },
            {}
        )
        return settingEntities
    }

    return null
}
