'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

import {
  buildClaudeRemoteConfigJson,
  buildMcpHttpConfigJson,
  CLAUDE_DESKTOP_CONFIG_PATH_MAC,
} from '@/lib/mcp/client-config'
import { markMcpConfigured } from '@/lib/mcp/connection-status'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'

export type McpConnectionTestResult = {
  ok: boolean
  profile_type?: string | null
  organization_id?: string | null
  profile_count?: number
  error?: string
}

function buildCursorConfigJson(mcpUrl: string, token: string): string {
  return buildMcpHttpConfigJson(mcpUrl, token)
}

export function useMcpConnectionInfo(mcpProfileType?: AgentProfileType | null) {
  const { user, isLoaded, supabase } = useAuth()
  const [origin, setOrigin] = useState('')
  const [tokenCopied, setTokenCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [configCopied, setConfigCopied] = useState(false)
  const [claudeConfigCopied, setClaudeConfigCopied] = useState(false)
  const [tokenDownloaded, setTokenDownloaded] = useState(false)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<McpConnectionTestResult | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const refreshSessionMeta = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setTokenExpiresAt(data.session?.expires_at ?? null)
    return data.session
  }, [supabase])

  useEffect(() => {
    if (!isLoaded) return
    void refreshSessionMeta()
  }, [isLoaded, refreshSessionMeta, user?.id])

  const mcpUrl = useMemo(() => (origin ? `${origin}/api/mcp` : '/api/mcp'), [origin])
  const oauthMetadataUrl = useMemo(
    () => (origin ? `${origin}/.well-known/oauth-protected-resource` : ''),
    [origin]
  )

  const copyMcpUrl = useCallback(async () => {
    await navigator.clipboard.writeText(mcpUrl)
    setUrlCopied(true)
    window.setTimeout(() => setUrlCopied(false), 2000)
  }, [mcpUrl])

  const copyAccessToken = useCallback(async () => {
    const session = await refreshSessionMeta()
    const token = session?.access_token
    if (!token) throw new Error('No active session token')
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    window.setTimeout(() => setTokenCopied(false), 2000)
  }, [refreshSessionMeta])

  const copyCursorConfig = useCallback(async () => {
    const session = await refreshSessionMeta()
    const token = session?.access_token
    if (!token) throw new Error('No active session token')
    await navigator.clipboard.writeText(buildCursorConfigJson(mcpUrl, token))
    setConfigCopied(true)
    window.setTimeout(() => setConfigCopied(false), 2000)
  }, [mcpUrl, refreshSessionMeta])

  const downloadAccessToken = useCallback(async () => {
    const session = await refreshSessionMeta()
    const token = session?.access_token
    if (!token) throw new Error('No active session token')
    const blob = new Blob([token], { type: 'text/plain' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'proof-mcp-token.txt'
    a.click()
    URL.revokeObjectURL(href)
    setTokenDownloaded(true)
    markMcpConfigured()
    window.setTimeout(() => setTokenDownloaded(false), 2000)
  }, [refreshSessionMeta])

  const copyClaudeConfig = useCallback(async () => {
    const session = await refreshSessionMeta()
    const token = session?.access_token
    if (!token) throw new Error('No active session token')
    await navigator.clipboard.writeText(buildClaudeRemoteConfigJson(mcpUrl, token))
    setClaudeConfigCopied(true)
    window.setTimeout(() => setClaudeConfigCopied(false), 2000)
  }, [mcpUrl, refreshSessionMeta])

  const cursorConfig = useMemo(() => buildMcpHttpConfigJson(mcpUrl, 'YOUR_SUPABASE_ACCESS_TOKEN'), [mcpUrl])
  const claudeConfig = useMemo(
    () => buildClaudeRemoteConfigJson(mcpUrl, 'YOUR_SUPABASE_ACCESS_TOKEN'),
    [mcpUrl]
  )

  const testConnection = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mcpProfileType ? { profile_type: mcpProfileType } : {}
        ),
      })
      const data = (await res.json()) as McpConnectionTestResult & { expires_at?: number | null }
      if (!res.ok || !data.ok) {
        setTestResult({ ok: false, error: data.error ?? 'request_failed' })
        return
      }
      if (data.expires_at) setTokenExpiresAt(data.expires_at)
      markMcpConfigured()
      setTestResult({
        ok: true,
        profile_type: data.profile_type,
        organization_id: data.organization_id,
        profile_count: data.profile_count,
      })
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : 'network_error',
      })
    } finally {
      setTestLoading(false)
    }
  }, [mcpProfileType])

  const tokenExpired = tokenExpiresAt != null && tokenExpiresAt * 1000 <= Date.now()

  return {
    mcpUrl,
    oauthMetadataUrl,
    cursorConfig,
    claudeConfig,
    claudeConfigPath: CLAUDE_DESKTOP_CONFIG_PATH_MAC,
    isAuthReady: isLoaded,
    isSignedIn: Boolean(user),
    userEmail: user?.email ?? null,
    tokenExpiresAt,
    tokenExpired,
    copyMcpUrl,
    copyAccessToken,
    downloadAccessToken,
    copyCursorConfig,
    copyClaudeConfig,
    testConnection,
    testLoading,
    testResult,
    urlCopied,
    tokenCopied,
    tokenDownloaded,
    configCopied,
    claudeConfigCopied,
  }
}
