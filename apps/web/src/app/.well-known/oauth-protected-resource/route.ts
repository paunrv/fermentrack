import { protectedResourceHandler } from 'mcp-handler'
import { supabaseOAuthIssuer } from '@/lib/mcp/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handler = protectedResourceHandler({
  authServerUrls: [supabaseOAuthIssuer()],
})

export { handler as GET, handler as OPTIONS }
