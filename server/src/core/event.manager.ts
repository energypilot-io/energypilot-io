import { ChildLogger, getLogger } from './log.manager.js'
import { emitWebsocketEvent } from './webserver.js'

const _observers: NotificationObserver[] = []

let _logger: ChildLogger

export abstract class NotificationObserver {
    abstract onNotification(event: string, ...args: any[]): void
}

export async function initEventManager() {
    _logger = getLogger('message-bus')
}

export function registerNotificationObserver(observer: NotificationObserver) {
    _observers.push(observer)
}

export function sendEvent(event: string, ...args: any[]) {
    _observers.forEach(observer => {
        try {
            observer.onNotification(event, ...args)
        } catch (error) {
            _logger.error(
                `Error notifying observer for event '${event}':`,
                error
            )
        }
    })

    emitWebsocketEvent(event, ...args)
}
