import fs from 'fs'
import { logging } from './log-manager'
import { TemplateDef } from 'server/defs/template'
import { posix } from 'path'

export namespace templates {
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

    var _logger: logging.ChildLogger

    const _templateRegistry: TemplateRegistry = {}

    export async function initTemplateEngine() {
        _logger = logging.getLogger('templates')

        _logger.info('Inventory scanning...')

        for (const filename of fs
            .readdirSync('./templates', {
                recursive: true,
            })
            .filter((item) => item.toString().endsWith('.json'))) {
            const path = posix.join('./templates', filename.toString())

            _logger.debug(`Scanning template [${path}]`)

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
                                    _templateRegistry[templateType][
                                        templateName
                                    ].interfaces,
                            },
                        })
                    )
                ),
            }))
        )
    }
}
