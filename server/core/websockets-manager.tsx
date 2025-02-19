import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { getLogger } from './logmanager'

export namespace websockets {
    let _io: Server

    export async function initWebSockets(httpServer: HttpServer<any, any>) {
        _io = new Server(httpServer)

        _io.on('connection', (socket) => {
            getLogger('websocket').debug(
                `Websocket client connected: [${socket.id}]`
            )

            // socket.on('something', (data) => {
            //     console.log(socket.id, data)
            //     socket.emit('event', 'pong')
            // })
        })
    }

    export function emitEvent(event: string, ...args: any[]) {
        _io.emit(event, ...args)
    }
}
