'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function useMcpConnectionInfo() {
  const { user, isLoaded, supabase } = useAuth()
  const [origin, setOrigin] = useState('')
  const [tokenCopied, setTokenCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

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
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('No active session token')
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    window.setTimeout(() => setTokenCopied(false), 2000)
  }, [supabase])

  const cursorConfig = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            proof: {
              url: mcpUrl,
              headers: {
                Authorization: 'Bearer YOUR_SUPABASE_ACCESS_TOKEN',
              },
            },
          },
        },
        null,
        2
      ),
    [mcpUrl]
  )

  return {
    mcpUrl,
    oauthMetadataUrl,
    cursorConfig,
    isAuthReady: isLoaded,
    isSignedIn: Boolean(user),
    userEmail: user?.email ?? null,
    copyMcpUrl,
    copyAccessToken,
    urlCopied,
    tokenCopied,
  }
}
