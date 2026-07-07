'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import { examplePromptsForProfile } from '@/lib/proof/connection-hub-tools'

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function AgentPromptDock({
  profileType,
  accent,
  mcpConfigured,
}: {
  profileType: ProfileType
  accent: string
  mcpConfigured: boolean
}) {
  const t = useTranslations('winemaker.home.desktop')
  const tHub = useTranslations('connectionHub')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const promptKeys = examplePromptsForProfile(profileType)
  const prompts = promptKeys.map(key => tHub(key))

  const copyPrompt = useCallback(async (text: string) => {
    const value = text.trim()
    if (!value) return
    await copyText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }, [])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void copyPrompt(draft).then(() => setDraft(''))
  }

  return (
    <section
      aria-label={t('agentDockTitle')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--hairline)',
        background: 'var(--panel)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{t('agentDockTitle')}</p>
        {!mcpConfigured ? (
          <Link
            href="/dashboard/conectar"
            className="ui-btn ui-btn--primary ui-btn--sm"
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            {t('connectAgent')}
          </Link>
        ) : (
          <Link
            href="/dashboard/conectar"
            style={{ fontSize: 12, fontWeight: 600, color: accent, textDecoration: 'none', flexShrink: 0 }}
          >
            {t('manageConnection')} →
          </Link>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>{t('agentDockHint')}</p>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'var(--panel-2)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 6px 6px 12px',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            display: 'grid',
            placeItems: 'center',
            color: accent,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          ✦
        </span>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={t('agentDockPlaceholder')}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: 'var(--fg-0)',
            fontFamily: 'var(--font-display)',
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: draft.trim() ? accent : 'var(--hairline)',
            color: draft.trim() ? '#fff' : 'var(--fg-3)',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {copied ? t('agentDockCopied') : t('agentDockCopy')}
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {prompts.map(prompt => (
          <button
            key={prompt}
            type="button"
            onClick={() => void copyPrompt(prompt)}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 999,
              border: '0.5px solid var(--hairline)',
              background: 'var(--ink)',
              color: 'var(--fg-2)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  )
}
