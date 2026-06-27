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

/** Notion-like sidebar: flat gray rail, accent only on active/hover */
const NOTION_NAV = {
  navGradient: 'var(--canvas)',
  navText: ['#787774', '#787774', '#787774', '#787774'] as const,
}

export const PROFILES: Record<ExtraProfile, ProfileTheme> = {
  distiller: {
    accent: '#0F7B6C',
    ...NOTION_NAV,
    badge: { bg: 'rgba(15, 123, 108, 0.1)', color: '#0F7B6C', border: 'rgba(15, 123, 108, 0.2)' },
    label: 'Destilador',
  },
  distributor: {
    accent: '#D9730D',
    ...NOTION_NAV,
    badge: { bg: 'rgba(217, 115, 13, 0.1)', color: '#D9730D', border: 'rgba(217, 115, 13, 0.2)' },
    label: 'Distribuidor',
  },
  winemaker: {
    accent: '#6940A5',
    ...NOTION_NAV,
    badge: { bg: 'rgba(105, 64, 165, 0.1)', color: '#6940A5', border: 'rgba(105, 64, 165, 0.2)' },
    label: 'Winemaker',
  },
  brewer: {
    accent: '#CB912F',
    ...NOTION_NAV,
    badge: { bg: 'rgba(203, 145, 47, 0.1)', color: '#CB912F', border: 'rgba(203, 145, 47, 0.2)' },
    label: 'Brewer',
  },
  bodega: {
    accent: '#2F5F8F',
    ...NOTION_NAV,
    badge: {
      bg: 'rgba(47, 95, 143, 0.1)',
      color: '#2F5F8F',
      border: 'rgba(47, 95, 143, 0.2)',
    },
    label: 'Bodega',
  },
}

/** Page background — pure white (same as --ink) */
export const CANVAS_BG = '#FFFFFF'

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
    ['--gold-soft' as string]: `${theme.accent}2E`,
    ['--copper' as string]: theme.accent,
    ['--copper-soft' as string]: theme.accent,
    ['--copper-glow' as string]: theme.badge.bg,
  }
}
