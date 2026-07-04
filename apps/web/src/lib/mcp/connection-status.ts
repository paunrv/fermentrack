const STORAGE_KEY = 'proof_mcp_configured_at'

export function markMcpConfigured(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

export function isMcpConfiguredLocally(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  const at = Number(raw)
  if (!Number.isFinite(at)) return false
  // Token ~1h; treat local flag as stale after 7 days (user can re-test)
  return Date.now() - at < 7 * 24 * 60 * 60 * 1000
}
