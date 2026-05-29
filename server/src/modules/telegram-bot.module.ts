import { Telegraf, Context } from 'telegraf'
import { ChildLogger, getLogger } from '../core/log.manager'
import {
    getSettingValue,
    registerSettingChangeObserver,
    setSettingValue,
    validateSettingPollingRate,
    validateSettingSnapshotPersistenceInterval,
} from '../core/setting.manager'
import { getLastLiveData } from '../core/data-update.manager'
import { escapeMarkdown, toPowerString } from '@/libs/utils'
import { getDeviceInstances, setDeviceStatus } from '@/core/device.manager'
import { DeviceBase } from '@/devices/device.base'
import { Device } from '@/entities/device.entity'
import { ModuleBase } from './module.base'
import { SettingChangeObserver } from '@/observers/setting-change.observer'

const _availableSettingsMessage: string =
    `*Available settings*\n` +
    `* \`polling_rate\` \\- Number of seconds between each polling\\.\n` +
    `* \`snapshot_persistance_interval\` \\- Number of seconds between each snapshot persistance\\.\n`

const SETTING_TELEGRAM_BOT_TOKEN = 'telegram_bot_token'

export class TelegramBotModule
    extends SettingChangeObserver
    implements ModuleBase
{
    private _logger: ChildLogger

    private _bot: Telegraf = undefined as any

    private _token: string | null | undefined = null

    constructor() {
        super()

        this._logger = getLogger('telegram-bot')

        registerSettingChangeObserver(this)

        Telegraf.log((message: string) => this._logger.info(message))

        process.once('SIGINT', () => this._bot?.stop('SIGINT'))
        process.once('SIGTERM', () => this._bot?.stop('SIGTERM'))
    }

    /*
     * SettingChangeObserver
     */

    getObservedSettings(): string[] {
        return [SETTING_TELEGRAM_BOT_TOKEN]
    }

    onSettingChange(name: string, value?: any): void {
        if (name === SETTING_TELEGRAM_BOT_TOKEN) {
            this._token = value
            this.createTelegramBot()
        }
    }

    /*
     * ModuleBase
     */

    static getSettings(): any {
        const settings: any = {
            telegram_bot: [
                {
                    group: 'token',
                    schema: {
                        type: 'object',
                        properties: {
                            [SETTING_TELEGRAM_BOT_TOKEN]: {
                                type: 'string',
                                minLength: 1,
                                default: '',
                            },
                        },
                    },
                },
            ],
        }

        return settings
    }

    /*
     *
     */

    createTelegramBot() {
        if (this._bot) {
            this._logger.info('Stopping existing Telegram bot instance')
            this._bot.stop()
        }

        if (!this._token) {
            this._logger.warn(
                'Telegram bot token not set. Telegram bot will not be started.'
            )
            return
        }

        this._bot = new Telegraf(this._token)
        this._bot.catch((err: any, ctx: Context) =>
            this._logger.error('Telegram bot error', { error: err })
        )

        this._bot.help((ctx: Context) =>
            ctx.replyWithMarkdownV2(this.getHelpMessage(ctx))
        )

        this._bot.command('live', (ctx: Context) => {
            ctx.replyWithMarkdownV2(this.handleCommandLive(ctx))
        })

        this._bot.command('set', (ctx: Context) => {
            ctx.replyWithMarkdownV2(this.handleCommandSet(ctx))
        })

        this._bot.command('get', async (ctx: Context) => {
            ctx.replyWithMarkdownV2(await this.handleCommandGet(ctx))
        })

        this._bot.command('devices', async (ctx: Context) => {
            ctx.replyWithMarkdownV2(await this.handleCommandDevices(ctx))
        })

        this._bot.telegram.setMyDescription('EnergyPilot.io Telegram Bot')

        this._bot.telegram.setMyCommands([
            { command: 'help', description: 'Show help message' },
            { command: 'live', description: 'Get live data values' },
            { command: 'set', description: 'Set a setting value' },
            { command: 'get', description: 'Get a setting value' },
            {
                command: 'devices',
                description: 'Get a list of devices and change their status',
            },
        ])

        this._bot.launch()

        this._logger.info(`Telegram bot started with token "${this._token}"`)
    }

    getHelpMessage(ctx: Context): string {
        const args = ctx.text!.split(' ').slice(1)
        if (args.length === 0) {
            return (
                `* \`/help <command>\` \\- Show this help message\\. Add command name as argument to get additional information\\.\nExample: \`/help set\`\n` +
                `* \`/live\` \\- Get live data values\n` +
                `* \`/set\` \\- Set a setting value\n` +
                `* \`/get\` \\- Get a setting value\n` +
                `* \`/devices\` \\- Get a list of devices and change their status\n`
            )
        } else if (args[0] === 'set') {
            return (
                `\`/set <setting_name> <value>\`\nSet a setting value\\.\nExample: \`/set polling_rate 15\`\n\n` +
                _availableSettingsMessage
            )
        } else if (args[0] === 'get') {
            return (
                `\`/get <setting_name>\`\nGet a setting value\\.\nExample: \`/get polling_rate\`\n\n` +
                _availableSettingsMessage
            )
        } else if (args[0] === 'devices') {
            return (
                `\`/devices\`\nGet a list of all devices and their properties\\.\n\n` +
                `\`/devices <device_id>\`\nGet the properties of the selected device\\.\nExample: \`/devices 5\`\n\n` +
                `\`/devices <device_id> \\[enable | disable\\]\`\nEnable/Disable the selected device\\.\nExample: \`/devices 5 disable\``
            )
        } else {
            return `⚠️ No help available for command \`"/${escapeMarkdown(args[0])}"\`\\.`
        }
    }

    async handleCommandGet(ctx: Context): Promise<string> {
        const args = ctx.text!.split(' ').slice(1)

        if (args.length < 1) {
            return '⚠️ Please provide a setting name\\. Example: `/get polling_rate`\\. Use `"/help get"` for more information\\.'
        } else {
            const settingName = args[0]

            const settingValue = await getSettingValue(settingName)

            if (settingValue === undefined) {
                return `⚠️ Setting \`"${escapeMarkdown(settingName)}"\` not found\\.`
            }

            return `\`"${escapeMarkdown(settingValue !== null ? settingValue.toString() : '<not set>')}"\``
        }
    }

    handleCommandSet(ctx: Context): string {
        const args = ctx.text!.split(' ').slice(1)

        if (args.length < 2) {
            return '⚠️ Please provide a setting name and value\\. Example: `/set polling_rate 15`\\. Use `"/help set"` for more information\\.'
        } else {
            const settingName = args[0]
            const settingValue = args[1]

            let errors
            if (settingName === 'polling_rate') {
                errors = validateSettingPollingRate(settingValue)
            } else if (settingName === 'snapshot_persistance_interval') {
                errors =
                    validateSettingSnapshotPersistenceInterval(settingValue)
            } else {
                return `⚠️ Setting \`"${escapeMarkdown(settingName)}"\` cannot be set via Telegram bot\\. Please use the web interface to change this setting\\.`
            }

            if (errors?.polling_rate || errors?.snapshot_persistance_interval) {
                return `⚠️ Error while validating value for setting \`"${escapeMarkdown(settingName)}"\`. Please check the value and try again\\.`
            } else {
                setSettingValue(settingName, settingValue)
                return `✅ Setting \`"${escapeMarkdown(settingName)}"\` updated to \`"${escapeMarkdown(settingValue)}"\``
            }
        }
    }

    async handleCommandDevices(ctx: Context): Promise<string> {
        const devices = getDeviceInstances()
        let deviceBases = Object.values(devices)

        const args = ctx.text!.split(' ').slice(1)

        if (args.length > 2) {
            return '⚠️ Too many parameters.\\. Example: `/devices 5`\\. Use `"/help devices"` for more information\\.'
        }

        if (args.length > 0) {
            let deviceId: number
            try {
                deviceId = parseInt(args[0])
            } catch {
                return '⚠️ Wrong format for parameter \\#1\\. Example: `/devices 5`\\. Use `"/help devices"` for more information\\.'
            }

            deviceBases = deviceBases.filter(
                (deviceBase: DeviceBase) =>
                    deviceBase.deviceDefinition.id === deviceId
            )
        }

        if (deviceBases.length === 0) {
            return '⚠️ No devices found'
        } else if (args.length > 0 && deviceBases.length > 1) {
            return '⚠️ Too many devices found with the same ID'
        }

        if (args.length === 2) {
            let isEnabled: boolean
            if (args[1].toLowerCase() === 'enable') {
                isEnabled = true
            } else if (args[1].toLowerCase() === 'disable') {
                isEnabled = false
            } else {
                return '⚠️ Wrong format for parameter \\#2\\. Example: `/devices 5 disable`\\. Use `"/help devices"` for more information\\.'
            }

            if (
                await setDeviceStatus(
                    deviceBases[0].deviceDefinition.name,
                    isEnabled
                )
            ) {
                return `✅ Successfully changed status to \`${isEnabled ? 'enable' : 'disable'}\` for device *"${escapeMarkdown(deviceBases[0].deviceDefinition.name)}"*`
            } else {
                return `❌ Error while changing status to \`${isEnabled ? 'enable' : 'disable'}\` for device *"${escapeMarkdown(deviceBases[0].deviceDefinition.name)}"*`
            }
        }

        return deviceBases
            .sort((a: DeviceBase, b: DeviceBase) =>
                a.deviceDefinition.name.localeCompare(b.deviceDefinition.name)
            )
            .map((deviceBase: DeviceBase) => {
                const deviceDefinition: Device = deviceBase.deviceDefinition

                return (
                    `${this.getEmojiForDeviceType(deviceDefinition.type)} *${escapeMarkdown(deviceDefinition.name)}*\n` +
                    `Created: \`${escapeMarkdown(
                        deviceDefinition.created_at.toLocaleString(
                            ctx.from?.language_code
                        )
                    )}\`\n` +
                    `Updated: \`${escapeMarkdown(
                        deviceDefinition.updated_at.toLocaleString(
                            ctx.from?.language_code
                        )
                    )}\`\n` +
                    `ID: \`${deviceDefinition.id}\`\n` +
                    `Model: \`${escapeMarkdown(deviceDefinition.model)}\`\n` +
                    `Type: \`${escapeMarkdown(deviceDefinition.type)}\`\n` +
                    `Interface: \`${escapeMarkdown(deviceDefinition.interface)}\`\n` +
                    `Connected: \`${deviceDefinition.connected ? '✅' : '❌'}\`\n` +
                    `Enabled: \`${deviceDefinition.is_enabled ? '✅' : '❌'}\`\n`
                )
            })
            .join('\n')
    }

    getEmojiForDeviceType(deviceType: string) {
        if (deviceType === 'consumer') {
            return '🔌'
        } else if (deviceType === 'pv') {
            return '☀️'
        } else if (deviceType === 'battery') {
            return '🔋'
        } else if (deviceType === 'home') {
            return '🏠'
        } else if (deviceType === 'grid') {
            return '⚡️'
        }
    }

    handleCommandLive(ctx: Context): string {
        const liveData = getLastLiveData()

        if (!liveData) {
            return '⚠️ No live data available'
        }

        let filteredSnapshots = liveData.device_snapshots
            .filter(
                (snapshot: any) =>
                    ['power', 'soc'].includes(snapshot.name) &&
                    snapshot.value !== null &&
                    snapshot.value !== undefined
            )
            .sort((a: any, b: any) =>
                a.device_name.localeCompare(b.device_name)
            )

        return (
            '`' +
            escapeMarkdown(
                new Date(liveData.created_at).toLocaleString(
                    ctx.from?.language_code
                )
            ) +
            '`' +
            '\n' +
            filteredSnapshots
                .map((snapshot: any) => {
                    let valueString = ''

                    valueString +=
                        this.getEmojiForDeviceType(snapshot.device_type) +
                        ` *${escapeMarkdown(snapshot.device_name)}*: `

                    if (snapshot.name === 'soc') {
                        valueString += `\`${snapshot.value.toLocaleString({ maximumFractionDigits: 2 })} %\``
                    } else if (snapshot.name === 'power') {
                        valueString += `\`${toPowerString(snapshot.value, true)}\``
                    }

                    return valueString
                })
                .join('\n')
        )
    }
}
