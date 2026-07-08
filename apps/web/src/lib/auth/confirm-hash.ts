export type AuthHashParams = {
  access_token?: string
  refresh_token?: string
  type?: string
  expires_at?: string
  token_type?: string
}

export function parseAuthHashParams(hash: string): AuthHashParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return {}

  const params = new URLSearchParams(raw)
  return {
    access_token: params.get('access_token') ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    type: params.get('type') ?? undefined,
    expires_at: params.get('expires_at') ?? undefined,
    token_type: params.get('token_type') ?? undefined,
  }
}

export function hasAuthHashTokens(hash: string): boolean {
  const parsed = parseAuthHashParams(hash)
  return Boolean(parsed.access_token && parsed.refresh_token)
}
