import { isInitializeRequest, McpServer } from '@modelcontextprotocol/server'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { v4 as uuidv4 } from 'uuid'
import type { CallToolResult } from '@modelcontextprotocol/server'

import express from 'express'
import { Request, Response } from 'express'
import { InMemoryEventStore } from '@/libs/in-memory-event-store.js'
import { ChildLogger, getLogger } from '@/core/log-manager.js'

import { getSolarForecastData } from '@/modules/solar-forecast-module.js'
import {
    findSnapshotsBetweenDates,
    getLastLiveData,
} from '../core/snapshot-manager.js'
import { endOfDay, startOfDay } from 'date-fns'
import { Snapshot } from '@/entities/snapshot.entity.js'
import { toISOStringWithTimezone } from '@/libs/utils.js'
import { isModuleActive } from '@/core/module-manager.js'
import { MCPServerModule } from '@/modules/mcp-server-module.js'

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
        'get_historical_values_for_date_range',
        {
            description:
                'Get historical energy or power values for a specified date range. You can specify a start and end date, and optionally a grouping (e.g., hour, day) and limit on the number of data points returned. The hourly grouping will return average power values for each hour, while the daily grouping will return total energy produced/consumed for each day for every device.',
            inputSchema: z
                .object({
                    startDate: z
                        .string()
                        .describe(
                            'Start date as an ISO string (e.g., "2024-01-01"). Time is not required and will be assumed to be the start of the day in UTC'
                        ),
                    endDate: z
                        .string()
                        .describe(
                            'End date as an ISO string (e.g., "2024-01-01"). Time is not required and will be assumed to be the end of the day in UTC'
                        ),
                    grouping: z.enum(['hour', 'day']).optional(),
                    limit: z
                        .number()
                        .optional()
                        .describe('Limit the number of data points returned'),
                })
                .describe('Parameters for retrieving historical values'),
            outputSchema: z.object({
                snapshots: z.array(
                    z.object({
                        created_at: z
                            .string()
                            .describe(
                                'Timestamp as ISO string for the snapshot'
                            ),

                        device_snapshots: z
                            .array(
                                z.object({
                                    device_id: z
                                        .number()
                                        .describe(
                                            'Technical unique identifier of the device. Not relevant for the user mostly'
                                        ),
                                    device_name: z
                                        .string()
                                        .describe(
                                            'Name of the device providing the data'
                                        ),
                                    device_type: z
                                        .string()
                                        .describe(
                                            'Type of the device (e.g., "Grid", "Battery", "Consumer", "PV")'
                                        ),
                                    value: z
                                        .number()
                                        .describe(
                                            'Current value in watts for no or hourly grouping. Current value in kilo watts per hour for daily grouping. Positive value for production, negative value for consumption. For batteries, positive value is discharging for own consumption, negative value is charging the battery. If value type is "soc", this represents the state of charge in percentage.'
                                        ),
                                    name: z
                                        .string()
                                        .describe(
                                            'Type of the value (e.g., "power", "soc", "energy"). This indicates what the value represents.'
                                        ),
                                })
                            )
                            .describe('All device snapshots for the timestamp'),
                    })
                ),
            }),
            annotations: {
                title: 'Get Historical Values',
                readOnlyHint: true,
            },
        },
        async ({
            startDate,
            endDate,
            grouping,
            limit,
        }: {
            startDate: string
            endDate: string
            grouping?: 'hour' | 'day'
            limit?: number
        }): Promise<CallToolResult> => {
            const startDatetime = startOfDay(new Date(startDate))
            const endDatetime = endOfDay(new Date(endDate))

            const snapshots = (await findSnapshotsBetweenDates({
                startDate: startDatetime,
                endDate: endDatetime,
                grouping,
                limit,
            })) as any

            if (!snapshots) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Failed: No historical data available.',
                        },
                    ],
                    isError: true,
                }
            }

            const structuredContent = {
                snapshots: snapshots.map((snapshot: any) => ({
                    created_at: toISOStringWithTimezone(snapshot.created_at),
                    device_snapshots: snapshot.device_snapshots,
                })),
            }

            console.log(structuredContent)

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
        'get_live_power_values',
        {
            description:
                'Get live power values from your configured devices. This includes current power production and consumption, device status, device type (e.g., "Grid", "Battery", "Consumer", "PV").',
            inputSchema: z.object({}).describe('No input parameters required'),
            outputSchema: z.object({
                created_at: z
                    .string()
                    .describe(
                        'Timestamp as ISO string of when the live data was retrieved'
                    ),
                live: z.array(
                    z.object({
                        device_id: z
                            .number()
                            .describe(
                                'Technical unique identifier of the device. Not relevant for the user mostly'
                            ),
                        device_name: z
                            .string()
                            .describe(
                                'Name of the device providing the live data'
                            ),
                        device_type: z
                            .string()
                            .describe(
                                'Type of the device (e.g., "Grid", "Battery", "Consumer", "PV")'
                            ),
                        value: z
                            .number()
                            .describe(
                                'Current power value in watts. Positive value for production, negative value for consumption. For batteries, positive value is discharging for own consumption, negative value is charging the battery. If value type is "soc", this represents the state of charge in percentage.'
                            ),
                        value_type: z
                            .string()
                            .describe(
                                'Type of the value (e.g., "power", "soc"). This indicates what the value represents.'
                            ),
                        status: z
                            .boolean()
                            .describe(
                                'Whether the device is currently connected'
                            ),
                        is_enabled: z
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
                created_at: string
                live: Array<{
                    device_id: number
                    device_name: string
                    device_type: string
                    value: number
                    value_type: string
                    status: boolean
                    is_enabled: boolean
                }>
            } = {
                created_at: toISOStringWithTimezone(liveData.created_at),
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
                        device_id: snapshot.device_id,
                        device_name: snapshot.device_name,
                        device_type: snapshot.device_type,
                        value_type: snapshot.name,
                        value: snapshot.value,
                        status:
                            snapshot.device_type === 'home'
                                ? true
                                : snapshot.connected,
                        is_enabled:
                            snapshot.device_type === 'home'
                                ? true
                                : snapshot.is_enabled,
                    })),
            }

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

    return server
}

const router = express.Router()

const transports: { [sessionId: string]: NodeStreamableHTTPServerTransport } =
    {}

function canHandleRequest(req: Request, res: Response) {
    if (isModuleActive(MCPServerModule.MODULE_NAME) === false) {
        res.status(503).json({
            jsonrpc: '2.0',
            error: { code: -32099, message: 'Module not active' },
            id: null,
        })
        return false
    }

    return true
}

router.post('/', async (req: Request, res: Response) => {
    if (!canHandleRequest(req, res)) {
        return
    }

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
                error: { code: -32001, message: 'Session not found' },
                id: null,
            })
            return
        } else {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
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
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            })
        }
    }
})

router.get('/', async (req: Request, res: Response) => {
    if (!canHandleRequest(req, res)) {
        return
    }

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
    if (!canHandleRequest(req, res)) {
        return
    }

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
