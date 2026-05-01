import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { ChildLogger, getLogger } from './logmanager'
import {
    getSettingValue,
    registerSettingChangeObserver,
    SETTING_TELEGRAM_BOT_TOKEN,
    SettingChangeObserver,
} from './settings-manager'
import { Setting } from '@/entities/settings.entity'

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
    _bot.start((ctx: Context) => ctx.reply('Welcome'))
    _bot.help((ctx: Context) => ctx.reply('Send me a sticker'))
    _bot.on(message('sticker'), (ctx: Context) => ctx.reply('👍'))
    _bot.hears('hi', (ctx: Context) => ctx.reply('Hey there'))

    _bot.launch()
}
