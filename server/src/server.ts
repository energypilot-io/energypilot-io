import express from 'express'
import cors from 'cors'

import apiRoutes from './core/api'

import { initLogging } from './core/logmanager'
import { initTemplateEngine } from './core/template-engine'

await initLogging()
await initTemplateEngine()

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello from Express!')
})

app.use('/api', apiRoutes)

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})
