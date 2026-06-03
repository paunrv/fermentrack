import type { CSSProperties } from 'react'
import type { ExtraProfile } from '@/lib/supabase'

export type ProfileBadgeStyle = {
  bg: string
  color: string
  border: string
}

export type ProfileTheme = {
  accent: string
  navGradient: string
  badge: ProfileBadgeStyle
  navText: readonly [string, string, string, string]
  label: string
}

export const PROFILES: Record<ExtraProfile, ProfileTheme> = {
  distiller: {
    accent: '#2D6A4F',
    navGradient: 'linear-gradient(180deg, #1B4332 0%, #2D6A4F 100%)',
    badge: { bg: '#2D6A4F18', color: '#2D6A4F', border: '#2D6A4F33' },
    navText: ['#95D5B2', '#74C69D', '#52B788', '#40916C'],
    label: 'Destilador',
  },
  distributor: {
    accent: '#C2410C',
    navGradient: 'linear-gradient(180deg, #7C2D12 0%, #C2410C 100%)',
    badge: { bg: '#C1440E18', color: '#C1440E', border: '#C1440E33' },
    navText: ['#FDBA74', '#FB923C', '#F97316', '#EA580C'],
    label: 'Distribuidor',
  },
  winemaker: {
    accent: '#6D28D9',
    navGradient: 'linear-gradient(180deg, #2E1065 0%, #6D28D9 100%)',
    badge: { bg: '#6D28D918', color: '#6D28D9', border: '#6D28D933' },
    navText: ['#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'],
    label: 'Winemaker',
  },
  brewer: {
    accent: '#B45309',
    navGradient: 'linear-gradient(180deg, #451A03 0%, #B45309 100%)',
    badge: { bg: '#B4530918', color: '#B45309', border: '#B4530933' },
    navText: ['#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'],
    label: 'Brewer',
  },
}

export const CANVAS_BG = '#F8F8F6'

export function getProfileTheme(profileType: ExtraProfile | undefined | null): ProfileTheme {
  if (profileType && profileType in PROFILES) {
    return PROFILES[profileType]
  }
  return PROFILES.distributor
}

export function proofAccentCssVars(theme: ProfileTheme): CSSProperties {
  return {
    ['--proof-accent' as string]: theme.accent,
    ['--gold' as string]: theme.accent,
    ['--gold-soft' as string]: `${theme.accent}59`,
    ['--copper' as string]: theme.accent,
    ['--copper-soft' as string]: theme.accent,
    ['--copper-glow' as string]: theme.badge.bg,
  }
}
