'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import type { ExtraProfile } from '@/lib/supabase'
import {
  mapOwnerAlertsToOperativas,
  type OwnerAlertDescriptor,
  type OwnerLotEventRow,
} from '@/lib/proof/winemaker-owner-alerts'
import {
  greetingPeriod,
  type OwnerLotRow,
} from '@/lib/supabase/winemaker-owner-home'

export function useWinemakerOwnerCopy() {
  const locale = useLocale() as AppLocale
  const tHome = useTranslations('winemaker.home')
  const tStage = useTranslations('winemaker.stage')
  const tOrgRole = useTranslations('dashboard.equipo.orgRoles')
  const tProfile = useTranslations('dashboard.settings.profileTypes')

  return useMemo(
    () => ({
      greeting: (date = new Date()) => tHome(`greeting.${greetingPeriod(date)}`),
      stageLabel: (stage: string | null) => {
        if (!stage) return tStage('none')
        return tStage.has(stage) ? tStage(stage) : stage
      },
      formatTaskTime: (dueAt: string | null) => {
        if (!dueAt) return tHome('noTime')
        return new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(dueAt))
      },
      profileBadgeLabel: (profileType: ExtraProfile | null) => {
        if (!profileType) return tHome('noProfile')
        return tProfile.has(profileType) ? tProfile(profileType) : profileType
      },
      orgRoleLabel: (role: string) => (tOrgRole.has(role) ? tOrgRole(role) : role),
      defaultFirstName: tHome('defaultFirstName'),
      mapAlerts: (descriptors: OwnerAlertDescriptor[]) =>
        mapOwnerAlertsToOperativas(descriptors, {
          tempTitle: p => tHome('alerts.tempTitle', p),
          tempSubtext: p => tHome('alerts.tempSubtext', p),
          staleTitle: p => tHome('alerts.staleTitle', p),
          staleSubtextWithEvent: p => tHome('alerts.staleSubtextWithEvent', p),
          staleSubtextNoEvent: () => tHome('alerts.staleSubtextNoEvent'),
          viewLot: () => tHome('alerts.viewLot'),
        }),
      attentionCount: (count: number) => tHome('attentionCount', { count }),
    }),
    [locale, tHome, tStage, tOrgRole, tProfile]
  )
}

export type WinemakerOwnerCopy = ReturnType<typeof useWinemakerOwnerCopy>

export type { OwnerLotRow, OwnerLotEventRow }
