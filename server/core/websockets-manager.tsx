import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

export namespace websockets {
    let _io: Server

    export async function initWebSockets(httpServer: HttpServer<any, any>) {
        _io = new Server(httpServer)

        _io.on('connection', (socket) => {
            // here you can do whatever you want with the socket of the client, in this
            // example I'm logging the socket.id of the client
            console.log(socket.id, 'connected')
            // and I emit an event to the client called `event` with a simple message
            socket.emit('event', 'connected!')
            // and I start listening for the event `something`
            socket.on('something', (data) => {
                // log the data together with the socket.id who send it
                console.log(socket.id, data)
                // and emeit the event again with the message pong
                socket.emit('event', 'pong')
            })
        })
    }

    export function emitEvent(event: string) {
        _io.emit(event)
    }
}
