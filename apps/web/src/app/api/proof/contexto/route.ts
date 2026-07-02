import { deprecatedHostedAiResponse } from '@/lib/proof/deprecated-hosted-ai'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST() {
  return deprecatedHostedAiResponse()
}
