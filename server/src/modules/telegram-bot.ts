import { Telegraf, Context } from 'telegraf'
import { ChildLogger, getLogger } from '../core/log.manager'
import {
    getSettingValue,
    registerSettingChangeObserver,
    setSettingValue,
    SETTING_TELEGRAM_BOT_TOKEN,
    SettingChangeObserver,
    validateSettingPollingRate,
    validateSettingSnapshotPersistenceInterval,
} from '../core/setting.manager'
import { getLastLiveData } from '../core/data-update.manager'
import { escapeMarkdown, toPowerString } from '@/libs/utils'
import { getDeviceInstances } from '@/core/device.manager'
import { DeviceBase } from '@/devices/device.base'
import { Device } from '@/entities/device.entity'

let _bot: Telegraf = undefined as any
let _logger: ChildLogger

let _token: string | null | undefined = null

const _availableSettingsMessage: string =
    `*Available settings*\n` +
    `🔘 \`polling_rate\` \\- Number of seconds between each polling\\.\n` +
    `🔘 \`snapshot_persistance_interval\` \\- Number of seconds between each snapshot persistance\\.\n`

class TelegramBotSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [SETTING_TELEGRAM_BOT_TOKEN]
    }

    onSettingChange(name: string, value?: any): void {
        if (name === SETTING_TELEGRAM_BOT_TOKEN) {
            _token = value
            createTelegramBot()
        }
    }
}

export async function initTelegramBot() {
    _logger = getLogger('telegram-bot')

    await registerSettingChangeObserver(new TelegramBotSettingChangeObserver())

    Telegraf.log((message: string) => _logger.info(message))

    process.once('SIGINT', () => _bot?.stop('SIGINT'))
    process.once('SIGTERM', () => _bot?.stop('SIGTERM'))
}

function createTelegramBot() {
    if (_bot) {
        _logger.info('Stopping existing Telegram bot instance')
        _bot.stop()
    }

    if (!_token) {
        _logger.warn(
            'Telegram bot token not set. Telegram bot will not be started.'
        )
        return
    }

    _bot = new Telegraf(_token)
    _bot.catch((err: any, ctx: Context) =>
        _logger.error('Telegram bot error', { error: err })
    )

    _bot.help((ctx: Context) => ctx.replyWithMarkdownV2(getHelpMessage(ctx)))

    _bot.command('live', (ctx: Context) => {
        ctx.replyWithMarkdownV2(handleCommandLive(ctx))
    })

    _bot.command('set', (ctx: Context) => {
        ctx.replyWithMarkdownV2(handleCommandSet(ctx))
    })

    _bot.command('get', async (ctx: Context) => {
        ctx.replyWithMarkdownV2(await handleCommandGet(ctx))
    })

    _bot.command('devices', (ctx: Context) => {
        ctx.replyWithMarkdownV2(handleCommandDevices(ctx))
    })

    _bot.telegram.setMyDescription('EnergyPilot.io Telegram Bot')

    _bot.telegram.setMyCommands([
        { command: 'help', description: 'Show help message' },
        { command: 'live', description: 'Get live data values' },
        { command: 'set', description: 'Set a setting value' },
        { command: 'get', description: 'Get a setting value' },
        { command: 'devices', description: 'Get a list of devices' },
    ])

    _bot.launch()

    _logger.info(`Telegram bot started with token "${_token}"`)
}

function getHelpMessage(ctx: Context): string {
    const args = ctx.text!.split(' ').slice(1)
    if (args.length === 0) {
        return (
            `🔘 \`/help <command>\` \\- Show this help message\\. Add command name as argument to get additional information\\.\nExample: \`/help set\`\n` +
            `🔘 \`/live\` \\- Get live data values\n` +
            `🔘 \`/set\` \\- Set a setting value\n` +
            `🔘 \`/get\` \\- Get a setting value\n` +
            `🔘 \`/devices\` \\- Get a list of devices\n`
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
            `\`/devices \\[device_id\\]\`\nGet a list of devices\\.\nExample: \`/devices 5\`\n\n` +
            'If no device id is entered, all devices are returned\\.'
        )
    } else {
        return `⚠️ No help available for command \`"/${escapeMarkdown(args[0])}"\`\\.`
    }
}

async function handleCommandGet(ctx: Context): Promise<string> {
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

function handleCommandSet(ctx: Context): string {
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
            errors = validateSettingSnapshotPersistenceInterval(settingValue)
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

function handleCommandDevices(ctx: Context): string {
    const devices = getDeviceInstances()
    let deviceBases = Object.values(devices)

    const args = ctx.text!.split(' ').slice(1)

    if (args.length === 1) {
        let deviceId: number
        try {
            deviceId = parseInt(args[0])
        } catch {
            return '⚠️ Wrong paramter format.\\. Example: `/devices 5`\\. Use `"/help devices"` for more information\\.'
        }
        deviceBases = deviceBases.filter(
            (deviceBase: DeviceBase) =>
                deviceBase.deviceDefinition.id === deviceId
        )
    } else if (args.length > 1) {
        return '⚠️ Too many parameters.\\. Example: `/devices 5`\\. Use `"/help devices"` for more information\\.'
    }

    if (deviceBases.length === 0) {
        return '⚠️ No devices found'
    }

    return deviceBases
        .sort((a: DeviceBase, b: DeviceBase) =>
            a.deviceDefinition.name.localeCompare(b.deviceDefinition.name)
        )
        .map((deviceBase: DeviceBase) => {
            const deviceDefinition: Device = deviceBase.deviceDefinition

            return (
                `${getEmojiForDeviceType(deviceDefinition.type)} *${escapeMarkdown(deviceDefinition.name)}*\n` +
                `Created: \`${escapeMarkdown(
                    deviceDefinition.created_at.toLocaleString(
                        ctx.from?.language_code
                    )
                )}\`\n` +
                `ID: \`${deviceDefinition.id}\`\n` +
                `Model: \`${escapeMarkdown(deviceDefinition.model)}\`\n` +
                `Type: \`${escapeMarkdown(deviceDefinition.type)}\`\n` +
                `Interface: \`${escapeMarkdown(deviceDefinition.interface)}\`\n` +
                '_Properties_\n' +
                `Connected: \`${deviceDefinition.connected ? '✅' : '❌'}\`\n`
            )
        })
        .join('\n')
}

function getEmojiForDeviceType(deviceType: string) {
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

function handleCommandLive(ctx: Context): string {
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
        .sort((a: any, b: any) => a.device_name.localeCompare(b.device_name))

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
                    getEmojiForDeviceType(snapshot.device_type) +
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
