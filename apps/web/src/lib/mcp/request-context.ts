import { AsyncLocalStorage } from 'async_hooks'

export type McpRequestContext = {
  userId: string
  accessToken: string
}

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>()

export function getMcpRequestContext(): McpRequestContext | undefined {
  return mcpRequestContext.getStore()
}
