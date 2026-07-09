'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LotBottlingForm } from '@/components/proof/LotBottlingForm'
import { LotLineageCard } from '@/components/proof/LotLineageCard'
import { LotLabAnalysisSection } from '@/components/proof/LotLabAnalysisSection'
import { LotTeamChatSection } from '@/components/proof/LotTeamChatSection'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { useWinemakerOwnerCopy } from '@/hooks/useWinemakerOwnerCopy'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchLabSamplesForLot,
  type LotLabSample,
} from '@/lib/proof/fetch-lab-reports'
import { fetchLotLineage, type LotLineageViewModel } from '@/lib/proof/fetch-lot-lineage'
import type { LotEtapa } from '@/lib/proof/lot-etapa'
import { fetchOwnerOrganizationId, varietalNamesFromInputs } from '@/lib/supabase/winemaker-owner-home'

type LotDetail = {
  id: string
  code: string
  current_stage: string | null
  etapa: LotEtapa
  status: string
  notes: string | null
  varietal: string | null
}

export default function WinemakerLotDetailPage() {
  const params = useParams<{ id: string }>()
  const lotId = params.id
  const supabase = useSupabase()
  const copy = useWinemakerOwnerCopy()
  const t = useTranslations('winemaker.lotDetail')
  const tCommon = useTranslations('winemaker.common')
  const tStatus = useTranslations('winemaker.lotStatus')
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { loading: scopeLoading, ok } = useWinemakerRouteGuard()
  const [lot, setLot] = useState<LotDetail | null>(null)
  const [lineage, setLineage] = useState<LotLineageViewModel | null>(null)
  const [labSamples, setLabSamples] = useState<LotLabSample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !lotId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('notAuthenticated')

        const orgId = await fetchOwnerOrganizationId(supabase, user.id)
        if (!orgId) throw new Error('noOrganization')

        const { data, error: lotError } = await supabase
          .from('lots')
          .select('id, code, current_stage, etapa, status, notes, lot_grape_inputs(varietals(name))')
          .eq('id', lotId)
          .eq('organization_id', orgId)
          .maybeSingle()

        if (lotError) throw lotError
        if (!data) throw new Error('notFound')

        const varietalNames = varietalNamesFromInputs(data.lot_grape_inputs)

        const lineageData = await fetchLotLineage(supabase, lotId, orgId)
        const lotLabSamples = await fetchLabSamplesForLot(supabase, lotId)

        if (!cancelled) {
          setLot({
            id: data.id,
            code: data.code,
            current_stage: data.current_stage,
            etapa: data.etapa ?? 'cosecha',
            status: data.status,
            notes: data.notes,
            varietal: varietalNames.length > 0 ? varietalNames.join(', ') : null,
          })
          setLineage(lineageData)
          setLabSamples(lotLabSamples)
        }
      } catch (err) {
        if (!cancelled) {
          const key =
            err instanceof Error &&
            ['notAuthenticated', 'noOrganization', 'notFound'].includes(err.message)
              ? err.message
              : 'loadFailed'
          setError(t(`errors.${key}` as 'errors.loadFailed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [lotId, ok, supabase, t])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  const statusLabel =
    lot && tStatus.has(lot.status) ? tStatus(lot.status) : lot?.status ?? ''

  const backLink = (
    <Link
      href="/dashboard/winemaker/lotes"
      style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none', fontWeight: 600 }}
    >
      {t('back')}
    </Link>
  )

  let body: ReactNode
  if (loading) {
    body = <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>{t('loading')}</p>
  } else if (error || !lot) {
    body = (
      <p style={{ margin: 0, fontSize: 14, color: 'var(--crit)' }}>{error ?? t('notFound')}</p>
    )
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-2)' }}>
            {t('statusLabel', { status: statusLabel })}
          </p>
          {lot.notes ? (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--fg-2)' }}>{lot.notes}</p>
          ) : null}
        </div>
        {lineage ? <LotLineageCard lineage={lineage} /> : null}
        <LotLabAnalysisSection samples={labSamples} />
        <LotBottlingForm lotId={lot.id} />
        <LotTeamChatSection lotId={lot.id} />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100%',
          background: 'var(--canvas)',
          color: 'var(--fg-0)',
          padding: '16px 16px calc(16px + var(--proof-bottom-nav))',
        }}
      >
        {backLink}
        {loading ? (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--fg-3)' }}>{t('loading')}</p>
        ) : error || !lot ? (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--crit)' }}>
            {error ?? t('notFound')}
          </p>
        ) : (
          <div style={{ marginTop: 20 }}>
            <h1
              style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {lot.code}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
              {copy.stageLabel(lot.current_stage)}
              {lot.varietal ? ` · ${lot.varietal}` : ''}
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-2)' }}>
              {t('statusLabel', { status: statusLabel })}
            </p>
            {lot.notes ? (
              <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--fg-2)' }}>{lot.notes}</p>
            ) : null}
            {lineage ? <LotLineageCard lineage={lineage} /> : null}
            <LotLabAnalysisSection samples={labSamples} />
            <LotBottlingForm lotId={lot.id} />
            <LotTeamChatSection lotId={lot.id} />
          </div>
        )}
      </div>
    )
  }

  return (
    <VuOpsPage
      title={lot?.code ?? t('loading')}
      description={
        lot
          ? `${copy.stageLabel(lot.current_stage)}${lot.varietal ? ` · ${lot.varietal}` : ''}`
          : undefined
      }
      actions={backLink}
    >
      {body}
    </VuOpsPage>
  )
}
