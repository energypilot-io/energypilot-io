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

    export type AvailableTemplates = {
        [type: string]: {
            [name: string]: {
                path: string
                interfaces: string[]
            }
        }
    }

    var _logger: logging.ChildLogger

    const _availableTemplates: AvailableTemplates = {}

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

            const entry = {
                path: path,
                interfaces: template.interfaces,
            }

            for (const type of Object.keys(template).filter(
                (item) => ValidTemplateTypes.indexOf(item) > -1
            )) {
                if (!(type in _availableTemplates)) {
                    _availableTemplates[type] = {}
                }

                _availableTemplates[type][template.name] = entry
            }
        }
    }

    export function getAvailableTemplates() {
        return _availableTemplates
    }
}
