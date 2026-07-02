import { deprecatedHostedAiResponse } from '@/lib/proof/deprecated-hosted-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  return deprecatedHostedAiResponse({
    hint: 'Use distributor.credito.collection.fallbackMessage in the UI or MCP get_cobro_context.',
  })
}
