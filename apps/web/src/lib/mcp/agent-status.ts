export type McpAgentStatusResponse = {
  tokenExpiresAt: number | null
  tokenExpired: boolean
  lastToolCall: {
    toolName: string
    status: string
    createdAt: string
  } | null
}
