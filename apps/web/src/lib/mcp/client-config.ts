/** Streamable HTTP — Cursor and Claude Desktop recientes. */
export function buildMcpHttpConfigJson(mcpUrl: string, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        proof: {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2
  )
}

/** mcp-remote bridge — Claude Desktop (más compatible). */
export function buildClaudeRemoteConfigJson(mcpUrl: string, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        proof: {
          command: 'npx',
          args: ['-y', 'mcp-remote', mcpUrl, '--header', `Authorization: Bearer ${token}`],
        },
      },
    },
    null,
    2
  )
}

export const CLAUDE_DESKTOP_CONFIG_PATH_MAC =
  '~/Library/Application Support/Claude/claude_desktop_config.json'
