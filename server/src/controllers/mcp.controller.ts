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
            websiteUrl:
                'https://github.com/modelcontextprotocol/typescript-sdk',
        },
        {
            capabilities: {
                logging: {},
            },
        }
    )

    // Register a simple tool that returns a greeting
    server.registerTool(
        'greet',
        {
            title: 'Greeting Tool', // Display name for UI
            description: 'A simple greeting tool',
            inputSchema: z.object({
                name: z.string().describe('Name to greet'),
            }),
        },
        async ({ name }): Promise<CallToolResult> => {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Hello, ${name}!`,
                    },
                ],
            }
        }
    )

    // Register a tool that sends multiple greetings with notifications (with annotations)
    server.registerTool(
        'multi-greet',
        {
            description:
                'A tool that sends different greetings with delays between them',
            inputSchema: z.object({
                name: z.string().describe('Name to greet'),
            }),
            annotations: {
                title: 'Multiple Greeting Tool',
                readOnlyHint: true,
                openWorldHint: false,
            },
        },
        async ({ name }, ctx): Promise<CallToolResult> => {
            const sleep = (ms: number) =>
                new Promise(resolve => setTimeout(resolve, ms))

            await ctx.mcpReq.log('debug', `Starting multi-greet for ${name}`)

            await sleep(1000) // Wait 1 second before first greeting

            await ctx.mcpReq.log('info', `Sending first greeting to ${name}`)

            await sleep(1000) // Wait another second before second greeting

            await ctx.mcpReq.log('info', `Sending second greeting to ${name}`)

            return {
                content: [
                    {
                        type: 'text',
                        text: `Good morning, ${name}!`,
                    },
                ],
            }
        }
    )
    // Register a tool that demonstrates form elicitation (user input collection with a schema)
    // This creates a closure that captures the server instance
    server.registerTool(
        'collect-user-info',
        {
            description:
                'A tool that collects user information through form elicitation',
            inputSchema: z.object({
                infoType: z
                    .enum(['contact', 'preferences', 'feedback'])
                    .describe('Type of information to collect'),
            }),
        },
        async ({ infoType }, ctx): Promise<CallToolResult> => {
            let message: string
            let requestedSchema: {
                type: 'object'
                properties: Record<string, PrimitiveSchemaDefinition>
                required?: string[]
            }

            switch (infoType) {
                case 'contact': {
                    message = 'Please provide your contact information'
                    requestedSchema = {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                title: 'Full Name',
                                description: 'Your full name',
                            },
                            email: {
                                type: 'string',
                                title: 'Email Address',
                                description: 'Your email address',
                                format: 'email',
                            },
                            phone: {
                                type: 'string',
                                title: 'Phone Number',
                                description: 'Your phone number (optional)',
                            },
                        },
                        required: ['name', 'email'],
                    }
                    break
                }
                case 'preferences': {
                    message = 'Please set your preferences'
                    requestedSchema = {
                        type: 'object',
                        properties: {
                            theme: {
                                type: 'string',
                                title: 'Theme',
                                description: 'Choose your preferred theme',
                                enum: ['light', 'dark', 'auto'],
                                enumNames: ['Light', 'Dark', 'Auto'],
                            },
                            notifications: {
                                type: 'boolean',
                                title: 'Enable Notifications',
                                description:
                                    'Would you like to receive notifications?',
                                default: true,
                            },
                            frequency: {
                                type: 'string',
                                title: 'Notification Frequency',
                                description:
                                    'How often would you like notifications?',
                                enum: ['daily', 'weekly', 'monthly'],
                                enumNames: ['Daily', 'Weekly', 'Monthly'],
                            },
                        },
                        required: ['theme'],
                    }
                    break
                }
                case 'feedback': {
                    message = 'Please provide your feedback'
                    requestedSchema = {
                        type: 'object',
                        properties: {
                            rating: {
                                type: 'integer',
                                title: 'Rating',
                                description: 'Rate your experience (1-5)',
                                minimum: 1,
                                maximum: 5,
                            },
                            comments: {
                                type: 'string',
                                title: 'Comments',
                                description: 'Additional comments (optional)',
                                maxLength: 500,
                            },
                            recommend: {
                                type: 'boolean',
                                title: 'Would you recommend this?',
                                description:
                                    'Would you recommend this to others?',
                            },
                        },
                        required: ['rating', 'recommend'],
                    }
                    break
                }
                default: {
                    throw new Error(`Unknown info type: ${infoType}`)
                }
            }

            try {
                // Use sendRequest through the ctx parameter to elicit input
                const result = await ctx.mcpReq.send({
                    method: 'elicitation/create',
                    params: {
                        mode: 'form',
                        message,
                        requestedSchema,
                    },
                })

                if (result.action === 'accept') {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Thank you! Collected ${infoType} information: ${JSON.stringify(result.content, null, 2)}`,
                            },
                        ],
                    }
                } else if (result.action === 'decline') {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `No information was collected. User declined ${infoType} information request.`,
                            },
                        ],
                    }
                } else {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Information collection was cancelled by the user.`,
                            },
                        ],
                    }
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error collecting ${infoType} information: ${error}`,
                        },
                    ],
                }
            }
        }
    )

    // Register a simple prompt with title
    server.registerPrompt(
        'greeting-template',
        {
            title: 'Greeting Template', // Display name for UI
            description: 'A simple greeting prompt template',
            argsSchema: z.object({
                name: z.string().describe('Name to include in greeting'),
            }),
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
    server.registerTool(
        'start-notification-stream',
        {
            description:
                'Starts sending periodic notifications for testing resumability',
            inputSchema: z.object({
                interval: z
                    .number()
                    .describe('Interval in milliseconds between notifications')
                    .default(100),
                count: z
                    .number()
                    .describe('Number of notifications to send (0 for 100)')
                    .default(50),
            }),
        },
        async ({ interval, count }, ctx): Promise<CallToolResult> => {
            const sleep = (ms: number) =>
                new Promise(resolve => setTimeout(resolve, ms))
            let counter = 0

            while (count === 0 || counter < count) {
                counter++
                try {
                    await ctx.mcpReq.log(
                        'info',
                        `Periodic notification #${counter} at ${new Date().toISOString()}`
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
    server.registerResource(
        'greeting-resource',
        'https://example.com/greetings/default',
        {
            title: 'Default Greeting', // Display name for UI
            description: 'A simple greeting resource',
            mimeType: 'text/plain',
        },
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

    // Create additional resources for ResourceLink demonstration
    server.registerResource(
        'example-file-1',
        'file:///example/file1.txt',
        {
            title: 'Example File 1',
            description: 'First example file for ResourceLink demonstration',
            mimeType: 'text/plain',
        },
        async (): Promise<ReadResourceResult> => {
            return {
                contents: [
                    {
                        uri: 'file:///example/file1.txt',
                        text: 'This is the content of file 1',
                    },
                ],
            }
        }
    )

    server.registerResource(
        'example-file-2',
        'file:///example/file2.txt',
        {
            title: 'Example File 2',
            description: 'Second example file for ResourceLink demonstration',
            mimeType: 'text/plain',
        },
        async (): Promise<ReadResourceResult> => {
            return {
                contents: [
                    {
                        uri: 'file:///example/file2.txt',
                        text: 'This is the content of file 2',
                    },
                ],
            }
        }
    )

    // Register a tool that returns ResourceLinks
    server.registerTool(
        'list-files',
        {
            title: 'List Files with ResourceLinks',
            description:
                'Returns a list of files as ResourceLinks without embedding their content',
            inputSchema: z.object({
                includeDescriptions: z
                    .boolean()
                    .optional()
                    .describe(
                        'Whether to include descriptions in the resource links'
                    ),
            }),
        },
        async ({ includeDescriptions = true }): Promise<CallToolResult> => {
            const resourceLinks: ResourceLink[] = [
                {
                    type: 'resource_link',
                    uri: 'https://example.com/greetings/default',
                    name: 'Default Greeting',
                    mimeType: 'text/plain',
                    ...(includeDescriptions && {
                        description: 'A simple greeting resource',
                    }),
                },
                {
                    type: 'resource_link',
                    uri: 'file:///example/file1.txt',
                    name: 'Example File 1',
                    mimeType: 'text/plain',
                    ...(includeDescriptions && {
                        description:
                            'First example file for ResourceLink demonstration',
                    }),
                },
                {
                    type: 'resource_link',
                    uri: 'file:///example/file2.txt',
                    name: 'Example File 2',
                    mimeType: 'text/plain',
                    ...(includeDescriptions && {
                        description:
                            'Second example file for ResourceLink demonstration',
                    }),
                },
            ]

            return {
                content: [
                    {
                        type: 'text',
                        text: 'Here are the available files as resource links:',
                    },
                    ...resourceLinks,
                    {
                        type: 'text',
                        text: '\nYou can read any of these resources using their URI.',
                    },
                ],
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
