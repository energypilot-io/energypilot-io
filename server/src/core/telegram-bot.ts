import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { ChildLogger, getLogger } from './logmanager'
import {
    getSettingValue,
    registerSettingChangeObserver,
    setSettingValue,
    SETTING_TELEGRAM_BOT_TOKEN,
    SettingChangeObserver,
    validateSettingPollingRate,
    validateSettingSnapshotPersistenceInterval,
} from './settings-manager'
import { Setting } from '@/entities/settings.entity'
import { getLastLiveData } from './data-update-manager'
import { escapeMarkdown, toEnergyString, toPowerString } from '@/libs/utils'

let _bot: Telegraf = undefined as any
let _logger: ChildLogger

let _token: string | null | undefined = null

class TelegramBotSettingChangeObserver extends SettingChangeObserver {
    getObservedSettings(): string[] {
        return [SETTING_TELEGRAM_BOT_TOKEN]
    }

    onSettingChange(setting: Setting): void {
        if (setting.name === SETTING_TELEGRAM_BOT_TOKEN) {
            _token = setting.value
            createTelegramBot()
        }
    }
}

export async function initTelegramBot() {
    _logger = getLogger('telegram-bot')

    registerSettingChangeObserver(new TelegramBotSettingChangeObserver())

    Telegraf.log((message: string) => _logger.info(message))

    process.once('SIGINT', () => _bot?.stop('SIGINT'))
    process.once('SIGTERM', () => _bot?.stop('SIGTERM'))

    _token = await getSettingValue(SETTING_TELEGRAM_BOT_TOKEN)
    createTelegramBot()
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

    // _bot.start((ctx: Context) => ctx.reply('Welcome'))
    // _bot.help((ctx: Context) => ctx.reply('Send me a sticker'))
    // _bot.on(message('sticker'), (ctx: Context) => ctx.reply('👍'))
    // _bot.hears('hi', (ctx: Context) => ctx.reply('Hey there'))

    _bot.help((ctx: Context) => ctx.replyWithMarkdownV2(getHelpMessage(ctx)))

    _bot.command('live', (ctx: Context) => {
        ctx.replyWithMarkdownV2(handleCommandLive(ctx))
    })

    _bot.command('set', (ctx: Context) => {
        ctx.replyWithMarkdownV2(handleCommandSet(ctx))
    })

    _bot.telegram.setMyCommands([
        { command: 'help', description: 'Show help message' },
        { command: 'live', description: 'Get live data values' },
        { command: 'set', description: 'Set a setting value' },
    ])

    _bot.launch()

    _logger.info('Telegram bot started')
}

function getHelpMessage(ctx: Context): string {
    const args = ctx.text!.split(' ').slice(1)
    if (args.length === 0) {
        return (
            `🔘 \`/help <command>\` \\- Show this help message\\. Add command name as argument to get additional information\\.\nExample: \`/help set\`\n` +
            `🔘 \`/live\` \\- Get live data values\n` +
            `🔘 \`/set\` \\- Set a setting\n`
        )
    } else if (args[0] === 'set') {
        return (
            `\`/set <setting_name> <value>\`\nSet a setting value\\.\nExample: \`/set polling_rate 15\`\n\n` +
            `*Available settings*\n` +
            `🔘 \`polling_rate\` \\- Number of seconds between each polling\\.\n` +
            `🔘 \`snapshot_persistance_interval\` \\- Number of seconds between each snapshot persistance\\.\n`
        )
    } else {
        return `⚠️ No help available for command \`"/${escapeMarkdown(args[0])}"\`\\.`
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

function handleCommandLive(_ctx: Context): string {
    const liveData = getLastLiveData()

    if (!liveData) {
        return '⚠️ No live data available'
    }

    let filteredSnapshots = liveData.device_snapshots.filter(
        (snapshot: any) =>
            ['power', 'soc'].includes(snapshot.name) &&
            snapshot.value !== null &&
            snapshot.value !== undefined
    )

    filteredSnapshots = [
        ...filteredSnapshots,
        {
            device_name: 'Home',
            device_type: 'home',
            name: 'power',
            value: liveData.device_snapshots.reduce(
                (acc: number, snapshot: any) => {
                    if (
                        snapshot.name === 'power' &&
                        snapshot.value !== null &&
                        snapshot.value !== undefined
                    ) {
                        return acc + snapshot.value
                    }
                    return acc
                },
                0
            ),
        },
    ]

    return (
        '*Live Values*\n' +
        'Created At: ' +
        '`' +
        escapeMarkdown(new Date(liveData.created_at).toLocaleString()) +
        '`' +
        '\n' +
        filteredSnapshots
            .sort((a: any, b: any) =>
                a.device_name.localeCompare(b.device_name)
            )
            .map((snapshot: any) => {
                let valueString = ''

                if (snapshot.device_type === 'consumer') {
                    valueString += '🔌'
                } else if (snapshot.device_type === 'pv') {
                    valueString += '☀️'
                } else if (snapshot.device_type === 'battery') {
                    valueString += '🔋'
                } else if (snapshot.device_type === 'home') {
                    valueString += '🏠'
                } else if (snapshot.device_type === 'grid') {
                    valueString += '⚡️'
                }

                valueString += `*${escapeMarkdown(snapshot.device_name)}*: `

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
