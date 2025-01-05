import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { logging } from './log-manager'

export namespace websockets {
    let _io: Server

    export async function initWebSockets(httpServer: HttpServer<any, any>) {
        const logger = logging.getLogger('websockets')

        _io = new Server(httpServer)

        _io.on('connection', (socket) => {
            logger.debug(`Websocket client connected: [${socket.id}]`)

            // socket.on('something', (data) => {
            //     console.log(socket.id, data)
            //     socket.emit('event', 'pong')
            // })
        })
    }

    export function emitEvent(event: string) {
        _io.emit(event)
    }
}
