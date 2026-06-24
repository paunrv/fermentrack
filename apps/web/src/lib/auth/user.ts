import type { User } from '@supabase/supabase-js'

export function getUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null
  const meta = user.user_metadata as Record<string, unknown> | undefined
  if (typeof meta?.avatar_url === 'string') return meta.avatar_url
  if (typeof meta?.picture === 'string') return meta.picture
  return null
}

export function getUserEmail(user: User | null | undefined): string {
  return user?.email ?? ''
}

export function getUserFirstName(user: User | null | undefined): string {
  if (!user) return ''
  const meta = user.user_metadata as Record<string, unknown> | undefined
  if (typeof meta?.first_name === 'string') return meta.first_name
  if (typeof meta?.full_name === 'string') {
    return meta.full_name.split(/\s+/)[0] ?? ''
  }
  return user.email?.split('@')[0] ?? ''
}

export function getUserInitials(user: User | null | undefined): string {
  if (!user) return 'U'
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const first =
    typeof meta?.first_name === 'string'
      ? meta.first_name
      : typeof meta?.full_name === 'string'
        ? (meta.full_name.split(/\s+/)[0] ?? '')
        : ''
  const last = typeof meta?.last_name === 'string' ? meta.last_name : ''
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0]?.toUpperCase() || 'U'
  return user.email?.[0]?.toUpperCase() || 'U'
}
