import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { registerProofMcpTools } from '@/lib/mcp/register-tools'
import { mcpRequestContext } from '@/lib/mcp/request-context'
import { verifyMcpBearerToken } from '@/lib/mcp/auth'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const baseHandler = createMcpHandler(
  server => {
    registerProofMcpTools(server)
  },
  {
    serverInfo: {
      name: 'proof-mcp',
      version: '0.0.1',
    },
  },
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== 'production',
  }
)

const authedHandler = withMcpAuth(
  async (req: Request) => {
    const auth = req.auth
    if (!auth?.token || !auth.clientId) {
      return new Response('Unauthorized', { status: 401 })
    }
    return mcpRequestContext.run(
      { userId: auth.clientId, accessToken: auth.token },
      () => baseHandler(req)
    )
  },
  verifyMcpBearerToken,
  { required: true }
)

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE }
