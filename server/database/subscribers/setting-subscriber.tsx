import { EventArgs, EventSubscriber } from '@mikro-orm/core'
import { Setting } from '../entities/setting.entity'

export type SettingObserver = (setting: Setting) => void

const _observers: { [key: string]: SettingObserver[] } = {}

export function registerObserver(key: string, observer: SettingObserver) {
    if (!(key in _observers)) {
        _observers[key] = []
    }
    _observers[key].push(observer)
}

export class SettingSubscriber implements EventSubscriber<Setting> {
    afterUpsert(args: EventArgs<Setting>): void | Promise<void> {
        if (!(args.entity.key in _observers)) return

        _observers[args.entity.key].forEach((observer) => {
            observer(args.entity)
        })
    }
}
