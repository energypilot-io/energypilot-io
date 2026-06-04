import { isInitializeRequest, McpServer } from '@modelcontextprotocol/server'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { v4 as uuidv4 } from 'uuid'
import type { CallToolResult } from '@modelcontextprotocol/server'

import express from 'express'
import { Request, Response } from 'express'
import { InMemoryEventStore } from '@/libs/inMemoryEventStore.js'
import { ChildLogger, getLogger } from '@/core/log.manager.js'

import { getSolarForecastData } from '@/modules/solar-forecast.module.js'
import { getLastLiveData } from '../core/data-update.manager.js'

let _logger: ChildLogger = getLogger('mcp-controller')

const getServer = () => {
    const server = new McpServer(
        {
            name: 'energypilot.io MCP Server',
            version: '2026.5',
            websiteUrl: 'https://energypilot.io',
        },
        {
            capabilities: {
                logging: {},
            },
        }
    )

    server.registerTool(
        'get_solar_forecast',
        {
            description:
                'Get solar forecast information for your configured location',
            inputSchema: z.object({}).describe('No input parameters required'),
            outputSchema: z.object({
                forecast: z.array(
                    z.object({
                        date: z
                            .string()
                            .describe(
                                'Timestamp as ISO string of the forecast'
                            ),
                        wattHoursPeriod: z
                            .number()
                            .describe(
                                'Watt hours produced in the forecast period'
                            ),
                        wattHours: z
                            .number()
                            .describe(
                                'Total watt hours produced up to this point in the day'
                            ),
                    })
                ),
            }),
            annotations: {
                title: 'Get Solar Forecast',
                readOnlyHint: true,
            },
        },
        async (): Promise<CallToolResult> => {
            const forecastData = getSolarForecastData()
            const forecastDataValues = Object.values(forecastData)

            if (forecastDataValues.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Failed: No solar forecast data available.',
                        },
                    ],
                    isError: true,
                }
            }

            let structuredContent: {
                [key: string]: Array<{
                    date: string
                    wattHoursPeriod: number
                    wattHours: number
                }>
            } = { forecast: [] }

            forecastDataValues.forEach(forecast => {
                structuredContent.forecast = [
                    ...structuredContent.forecast,
                    ...Object.entries(forecast).map(([date, value]) => ({
                        date: date,
                        wattHoursPeriod: value.wattHoursPeriod,
                        wattHours: value.wattHours,
                    })),
                ]
            })

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(structuredContent, null, 2),
                    },
                ],
                structuredContent: structuredContent,
            }
        }
    )

    server.registerTool(
        'get_live_values',
        {
            description:
                'Get live values from your configured devices. This includes current power production and consumption, device status, decive type (e.g., "Grid", "Battery", "Consumer", "PV").',
            inputSchema: z.object({}).describe('No input parameters required'),
            outputSchema: z.object({
                createdAt: z
                    .string()
                    .describe(
                        'Timestamp as ISO string of when the live data was retrieved'
                    ),
                live: z.array(
                    z.object({
                        deviceName: z
                            .string()
                            .describe(
                                'Name of the device providing the live data'
                            ),
                        deviceType: z
                            .string()
                            .describe(
                                'Type of the device (e.g., "Grid", "Battery", "Consumer", "PV")'
                            ),
                        value: z
                            .number()
                            .describe(
                                'Current value in watts (positive for production, negative for consumption). If value type is "soc", this represents the state of charge in percentage.'
                            ),
                        valueType: z
                            .string()
                            .describe(
                                'Type of the value (e.g., "power", "soc"). This indicates what the value represents.'
                            ),
                        status: z
                            .boolean()
                            .describe(
                                'Whether the device is currently connected'
                            ),
                        isEnabled: z
                            .boolean()
                            .describe(
                                'Whether the device is currently enabled'
                            ),
                    })
                ),
            }),
            annotations: {
                title: 'Get Live Values',
                readOnlyHint: true,
            },
        },
        async (): Promise<CallToolResult> => {
            const liveData = getLastLiveData()

            if (!liveData) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Failed: No live data available.',
                        },
                    ],
                    isError: true,
                }
            }

            const structuredContent: {
                createdAt: string
                live: Array<{
                    deviceName: string
                    deviceType: string
                    value: number
                    valueType: string
                    status: boolean
                    isEnabled: boolean
                }>
            } = {
                createdAt: liveData.created_at,
                live: liveData.device_snapshots
                    .filter(
                        (snapshot: any) =>
                            ['power', 'soc'].includes(snapshot.name) &&
                            snapshot.value !== null &&
                            snapshot.value !== undefined
                    )
                    .sort((a: any, b: any) =>
                        a.device_name.localeCompare(b.device_name)
                    )
                    .map((snapshot: any) => ({
                        deviceName: snapshot.device_name,
                        deviceType: snapshot.device_type,
                        valueType: snapshot.name,
                        value: snapshot.value,
                        status:
                            snapshot.device_type === 'home'
                                ? true
                                : snapshot.connected,
                        isEnabled:
                            snapshot.device_type === 'home'
                                ? true
                                : snapshot.is_enabled,
                    })),
            }

            console.log('Structured live data content:', structuredContent)

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            { live: structuredContent },
                            null,
                            2
                        ),
                    },
                ],
                structuredContent: structuredContent,
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
        _logger.debug(`Received MCP request for session: ${sessionId}`)
    } else {
        _logger.debug('Request body:', req.body)
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
                    _logger.info(`Session initialized with ID: ${sessionId}`)
                    transports[sessionId] = transport
                },
            })

            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
                const sid = transport.sessionId
                if (sid && transports[sid]) {
                    _logger.info(
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
        _logger.error('Error handling MCP request:', error)
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
        _logger.info(`Client reconnecting with Last-Event-ID: ${lastEventId}`)
    } else {
        _logger.info(`Establishing new SSE stream for session ${sessionId}`)
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

    _logger.info(
        `Received session termination request for session ${sessionId}`
    )

    try {
        const transport = transports[sessionId]
        await transport.handleRequest(req, res)
    } catch (error) {
        _logger.error('Error handling session termination:', error)
        if (!res.headersSent) {
            res.status(500).send('Error processing session termination')
        }
    }
})

export const McpController = router
