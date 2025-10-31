import { Injectable } from '@angular/core'
import { Socket } from 'ngx-socket-io'
import { map } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class WebsocketService {
    constructor(private socket: Socket) {}

    sendMessage(msg: string) {
        this.socket.emit('message', msg)
    }
    getMessage(event: string) {
        return this.socket.fromEvent(event)
    }
}
