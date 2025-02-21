import fs from 'fs'
import { TemplateDef } from 'server/defs/template'
import { posix } from 'path'
import { getLogger } from './logmanager'

export const ValidTemplateTypes: string[] = [
    'pv',
    'battery',
    'grid',
    'consumer',
]

export type TemplateRegistry = {
    [type: string]: {
        [name: string]: TemplateDef
    }
}

const _templateRegistry: TemplateRegistry = {}

export async function initTemplateEngine() {
    const logger = getLogger('templates')

    logger.log('Inventory scanning...')

    for (const filename of fs
        .readdirSync('./templates', {
            recursive: true,
        })
        .filter((item) => item.toString().endsWith('.json'))) {
        const path = posix.join('./templates', filename.toString())

        logger.debug(`Scanning template [${path}]`)

        const template = JSON.parse(
            fs.readFileSync(path, 'utf-8')
        ) as TemplateDef

        for (const type of Object.keys(template).filter(
            (item) => ValidTemplateTypes.indexOf(item) > -1
        )) {
            if (!(type in _templateRegistry)) {
                _templateRegistry[type] = {}
            }

            _templateRegistry[type][template.name] = template
        }
    }
}

export function getTemplateForType(type: string, name: string) {
    if (type in _templateRegistry) {
        const templatesForType = _templateRegistry[type]

        if (name in templatesForType) {
            return templatesForType[name]
        }
    }
    return undefined
}

export function getTemplateDefs() {
    return Object.assign(
        {},
        ...Object.keys(_templateRegistry).map((templateType) => ({
            [templateType]: Object.assign(
                {},
                ...Object.keys(_templateRegistry[templateType]).map(
                    (templateName) => ({
                        [templateName]: {
                            interfaces:
                                _templateRegistry[templateType][templateName]
                                    .interfaces,
                        },
                    })
                )
            ),
        }))
    )
}
