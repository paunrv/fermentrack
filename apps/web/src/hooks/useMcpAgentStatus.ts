'use client'

import { useEffect, useState } from 'react'
import type { McpAgentStatusResponse } from '@/lib/mcp/agent-status'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'

export function useMcpAgentStatus(
  enabled: boolean,
  profileType?: AgentProfileType | null
) {
  const [data, setData] = useState<McpAgentStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetch(
      profileType
        ? `/api/mcp/agent-status?profile_type=${encodeURIComponent(profileType)}`
        : '/api/mcp/agent-status'
    )
      .then(async res => {
        const json = (await res.json()) as McpAgentStatusResponse & { error?: string }
        if (!res.ok) throw new Error(json.error ?? 'request_failed')
        if (!cancelled) setData(json)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'request_failed')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, profileType])

  return { data, loading, error }
}
