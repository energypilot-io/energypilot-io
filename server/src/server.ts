import express from 'express'
import cors from 'cors'

import { initLogging } from './core/logmanager'
import { initTemplateEngine } from './core/template-engine'
import { initDatabase } from './core/database'

import { DeviceController } from './controllers'

await initLogging()
await initTemplateEngine()
await initDatabase()

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello from Express!')
})

app.use('/api/v1/devices', DeviceController)
app.use((req, res) => res.status(404).json({ message: 'No route found' }))

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})
