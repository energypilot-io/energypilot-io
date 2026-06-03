import { isInitializeRequest, McpServer } from '@modelcontextprotocol/server'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { v4 as uuidv4 } from 'uuid'
import type {
    CallToolResult,
    GetPromptResult,
    PrimitiveSchemaDefinition,
    ReadResourceResult,
    ResourceLink,
} from '@modelcontextprotocol/server'

import express from 'express'
import { Request, Response } from 'express'
import { InMemoryEventStore } from '@/libs/inMemoryEventStore.js'

const getServer = () => {
    const server = new McpServer(
        {
            name: 'simple-streamable-http-server',
            version: '1.0.0',
            icons: [
                {
                    src: './mcp.svg',
                    sizes: ['512x512'],
                    mimeType: 'image/svg+xml',
                },
            ],
            websiteUrl: 'https://energypilot.io',
        },
        {
            capabilities: {
                logging: {},
            },
        }
    )

    server.registerTool(
        'get_weather',
        {
            description: 'Get weather information for a city',
            inputSchema: z.object({
                city: z.string().describe('City name'),
                country: z.string().describe('Country code (e.g., US, UK)'),
            }),
            outputSchema: z.object({
                temperature: z.object({
                    celsius: z.number(),
                    fahrenheit: z.number(),
                }),
                conditions: z.enum([
                    'sunny',
                    'cloudy',
                    'rainy',
                    'stormy',
                    'snowy',
                ]),
                humidity: z.number().min(0).max(100),
                wind: z.object({
                    speed_kmh: z.number(),
                    direction: z.string(),
                }),
            }),
        },
        async ({ city, country }) => {
            // Parameters are available but not used in this example
            void city
            void country
            // Simulate weather API call
            const temp_c = Math.round((Math.random() * 35 - 5) * 10) / 10
            const conditions = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'][
                Math.floor(Math.random() * 5)
            ]

            const structuredContent = {
                temperature: {
                    celsius: temp_c,
                    fahrenheit: Math.round(((temp_c * 9) / 5 + 32) * 10) / 10,
                },
                conditions,
                humidity: Math.round(Math.random() * 100),
                wind: {
                    speed_kmh: Math.round(Math.random() * 50),
                    direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
                        Math.floor(Math.random() * 8)
                    ],
                },
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(structuredContent, null, 2),
                    },
                ],
                structuredContent,
            }
        }
    )

    return server
}

const router = express.Router()

const transports: { [sessionId: string]: NodeStreamableHTTPServerTransport } =
    {}

router.post('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (sessionId) {
        console.log(`Received MCP request for session: ${sessionId}`)
    } else {
        console.log('Request body:', req.body)
    }

    try {
        let transport: NodeStreamableHTTPServerTransport
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId]
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            const eventStore = new InMemoryEventStore()
            transport = new NodeStreamableHTTPServerTransport({
                sessionIdGenerator: () => uuidv4(),
                eventStore, // Enable resumability
                onsessioninitialized: sessionId => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`)
                    transports[sessionId] = transport
                },
            })

            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
                const sid = transport.sessionId
                if (sid && transports[sid]) {
                    console.log(
                        `Transport closed for session ${sid}, removing from transports map`
                    )
                    delete transports[sid]
                }
            }

            // Connect the transport to the MCP server BEFORE handling the request
            // so responses can flow back through the same transport
            const server = getServer()
            await server.connect(transport)

            await transport.handleRequest(req, res, req.body)
            return // Already handled
        } else if (sessionId) {
            res.status(404).json({
                jsonrpc: '2.0',
                error: { code: -32_001, message: 'Session not found' },
                id: null,
            })
            return
        } else {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32_000,
                    message: 'Bad Request: Session ID required',
                },
                id: null,
            })
            return
        }

        // Handle the request with existing transport - no need to reconnect
        // The existing transport is already connected to the server
        await transport.handleRequest(req, res, req.body)
    } catch (error) {
        console.error('Error handling MCP request:', error)
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32_603,
                    message: 'Internal server error',
                },
                id: null,
            })
        }
    }
})

router.get('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId) {
        res.status(400).send('Missing session ID')
        return
    }
    if (!transports[sessionId]) {
        res.status(404).send('Session not found')
        return
    }

    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined
    if (lastEventId) {
        console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`)
    } else {
        console.log(`Establishing new SSE stream for session ${sessionId}`)
    }

    const transport = transports[sessionId]
    await transport.handleRequest(req, res)
})

// Handle DELETE requests for session termination (according to MCP spec)
router.delete('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId) {
        res.status(400).send('Missing session ID')
        return
    }
    if (!transports[sessionId]) {
        res.status(404).send('Session not found')
        return
    }

    console.log(`Received session termination request for session ${sessionId}`)

    try {
        const transport = transports[sessionId]
        await transport.handleRequest(req, res)
    } catch (error) {
        console.error('Error handling session termination:', error)
        if (!res.headersSent) {
            res.status(500).send('Error processing session termination')
        }
    }
})

export const McpController = router
