import express, { Request, Response } from 'express'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
    CallToolResult,
    GetPromptResult,
    ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import * as z from 'zod/v4'

const mcpServer = new McpServer(
    {
        name: 'stateless-streamable-http-server',
        version: '1.0.0',
    },
    { capabilities: { logging: {} } }
)

// Register a simple prompt
mcpServer.registerPrompt(
    'greeting-template',
    {
        description: 'A simple greeting prompt template',
        argsSchema: {
            name: z.string().describe('Name to include in greeting'),
        },
    },
    async ({ name }): Promise<GetPromptResult> => {
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please greet ${name} in a friendly manner.`,
                    },
                },
            ],
        }
    }
)

// Register a tool specifically for testing resumability
mcpServer.registerTool(
    'start-notification-stream',
    {
        description:
            'Starts sending periodic notifications for testing resumability',
        inputSchema: {
            interval: z
                .number()
                .describe('Interval in milliseconds between notifications')
                .default(100),
            count: z
                .number()
                .describe('Number of notifications to send (0 for 100)')
                .default(10),
        },
    },
    async ({ interval, count }, extra): Promise<CallToolResult> => {
        const sleep = (ms: number) =>
            new Promise(resolve => setTimeout(resolve, ms))
        let counter = 0

        while (count === 0 || counter < count) {
            counter++
            try {
                await mcpServer.sendLoggingMessage(
                    {
                        level: 'info',
                        data: `Periodic notification #${counter} at ${new Date().toISOString()}`,
                    },
                    extra.sessionId
                )
            } catch (error) {
                console.error('Error sending notification:', error)
            }
            // Wait for the specified interval
            await sleep(interval)
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Started sending periodic notifications every ${interval}ms`,
                },
            ],
        }
    }
)

// Create a simple resource at a fixed URI
mcpServer.registerResource(
    'greeting-resource',
    'https://example.com/greetings/default',
    { mimeType: 'text/plain' },
    async (): Promise<ReadResourceResult> => {
        return {
            contents: [
                {
                    uri: 'https://example.com/greetings/default',
                    text: 'Hello, world!',
                },
            ],
        }
    }
)

const router = express.Router()

router.post('/', async (req: Request, res: Response) => {
    const server = mcpServer
    try {
        const transport: StreamableHTTPServerTransport =
            new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            })
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        res.on('close', () => {
            console.log('Request closed')
            transport.close()
            server.close()
        })
    } catch (error) {
        console.error('Error handling MCP request:', error)
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            })
        }
    }
})

router.get('/', async (req: Request, res: Response) => {
    console.log('Received GET MCP request')
    res.writeHead(405).end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed.',
            },
            id: null,
        })
    )
})

router.delete('/', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request')
    res.writeHead(405).end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed.',
            },
            id: null,
        })
    )
})

export const McpController = router
