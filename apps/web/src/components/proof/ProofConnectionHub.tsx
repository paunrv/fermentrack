'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMcpConnectionInfo } from '@/hooks/useMcpConnectionInfo'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { AgentProfileType } from '@/lib/proof/agent-context-types'
import {
  examplePromptsForProfile,
  manualLinksForProfile,
  toolsForProfile,
} from '@/lib/proof/connection-hub-tools'

function formatTokenExpiry(whenUnix: number, locale: string): string {
  const diffSec = whenUnix - Math.floor(Date.now() / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  const diffHour = Math.round(diffMin / 60)
  return rtf.format(diffHour, 'hour')
}

function CopyButton({
  label,
  copiedLabel,
  onClick,
  copied,
  disabled,
}: {
  label: string
  copiedLabel: string
  onClick: () => void | Promise<void>
  copied: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--hairline)',
        background: 'var(--panel)',
        color: 'var(--fg-0)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

function SetupCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="proof-connection-hub__card"
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{title}</h3>
      {children}
    </div>
  )
}

export function ProofConnectionHub({
  accent,
  profileType,
  mcpProfileType,
}: {
  accent: string
  profileType: ProfileType
  /** Scope sent to test-connection (winemaker vs distributor). */
  mcpProfileType?: AgentProfileType | null
}) {
  const t = useTranslations('connectionHub')
  const locale = useLocale()
  const {
    mcpUrl,
    oauthMetadataUrl,
    cursorConfig,
    isAuthReady,
    isSignedIn,
    userEmail,
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
    claudeConfig,
    claudeConfigPath,
  } = useMcpConnectionInfo(mcpProfileType)

  const tools = toolsForProfile(profileType)
  const manualLinks = manualLinksForProfile(profileType)
  const prompts = examplePromptsForProfile(profileType)

  return (
    <div
      className="proof-connection-hub"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: '20px 20px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 920,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {t('eyebrow')}
        </p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--fg-0)' }}>
          {t('title')}
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--fg-2)' }}>
          {t('subtitle')}
        </p>
      </header>

      <section
        style={{
          background: 'var(--color-background-primary)',
          border: `0.5px solid color-mix(in srgb, ${accent} 25%, var(--color-border-tertiary))`,
          borderRadius: 12,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 999,
              background: isSignedIn ? 'var(--ok-soft)' : 'var(--crit-soft)',
              color: isSignedIn ? 'var(--ok)' : 'var(--crit)',
            }}
          >
            {isAuthReady
              ? isSignedIn
                ? t('auth.connected')
                : t('auth.disconnected')
              : t('auth.checking')}
          </span>
          {userEmail ? (
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{userEmail}</span>
          ) : null}
        </div>

        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--fg-3)' }}>{t('mcpUrl')}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                flex: 1,
                minWidth: 200,
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--panel-2)',
                color: 'var(--fg-0)',
                wordBreak: 'break-all',
              }}
            >
              {mcpUrl}
            </code>
            <CopyButton
              label={t('copyUrl')}
              copiedLabel={t('copied')}
              onClick={copyMcpUrl}
              copied={urlCopied}
            />
            {isSignedIn ? (
              <CopyButton
                label={tokenDownloaded ? t('tokenDownloaded') : t('downloadToken')}
                copiedLabel={t('tokenDownloaded')}
                onClick={downloadAccessToken}
                copied={tokenDownloaded}
              />
            ) : null}
            {isSignedIn ? (
              <CopyButton
                label={t('copyToken')}
                copiedLabel={t('copied')}
                onClick={copyAccessToken}
                copied={tokenCopied}
              />
            ) : null}
            {isSignedIn ? (
              <CopyButton
                label={t('copyClaudeConfig')}
                copiedLabel={t('copied')}
                onClick={copyClaudeConfig}
                copied={claudeConfigCopied}
              />
            ) : null}
            {isSignedIn ? (
              <CopyButton
                label={t('copyCursorConfig')}
                copiedLabel={t('copied')}
                onClick={copyCursorConfig}
                copied={configCopied}
              />
            ) : null}
            {isSignedIn ? (
              <CopyButton
                label={testLoading ? t('testing') : t('testConnection')}
                copiedLabel={t('copied')}
                onClick={testConnection}
                copied={false}
                disabled={testLoading}
              />
            ) : null}
          </div>
        </div>

        {isSignedIn && tokenExpiresAt ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: tokenExpired ? 'var(--crit)' : 'var(--fg-3)',
            }}
          >
            {tokenExpired
              ? t('tokenExpired')
              : t('tokenExpiry', { when: formatTokenExpiry(tokenExpiresAt, locale) })}
          </p>
        ) : null}

        {testResult ? (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: testResult.ok ? 'var(--ok)' : 'var(--crit)',
              lineHeight: 1.45,
            }}
          >
            {testResult.ok
              ? t('test.ok', { profile: testResult.profile_type ?? '—' })
              : t('test.error', { detail: testResult.error ?? 'unknown' })}
          </p>
        ) : null}

        {oauthMetadataUrl ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
            {t('oauthHint')}{' '}
            <a href={oauthMetadataUrl} style={{ color: accent }} target="_blank" rel="noreferrer">
              {t('oauthLink')}
            </a>
          </p>
        ) : null}
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <SetupCard title={t('clients.claude')}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>
            {t('clients.claudeConfigPath', { path: claudeConfigPath })}
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
            <li>{t('clients.claudeStep1')}</li>
            <li>{t('clients.claudeStep2')}</li>
            <li>{t('clients.claudeStep3')}</li>
            <li>{t('clients.claudeStep4')}</li>
          </ol>
          {isSignedIn ? (
            <CopyButton
              label={t('copyClaudeConfig')}
              copiedLabel={t('copied')}
              onClick={copyClaudeConfig}
              copied={claudeConfigCopied}
            />
          ) : null}
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.45,
              padding: 12,
              borderRadius: 8,
              background: 'var(--panel-2)',
              overflow: 'auto',
              maxHeight: 200,
            }}
          >
            {claudeConfig}
          </pre>
        </SetupCard>

        <SetupCard title={t('clients.cursor')}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {t('clients.cursorHint')}
          </p>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.45,
              padding: 12,
              borderRadius: 8,
              background: 'var(--panel-2)',
              overflow: 'auto',
              maxHeight: 180,
            }}
          >
            {cursorConfig}
          </pre>
        </SetupCard>

        <SetupCard title={t('clients.chatgpt')}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {t('clients.chatgptHint')}
          </p>
        </SetupCard>
      </section>

      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
          {t('toolsTitle')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tools.map(tool => (
            <div
              key={tool.name}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background:
                    tool.kind === 'write'
                      ? `color-mix(in srgb, ${accent} 12%, transparent)`
                      : 'var(--panel-2)',
                  color: tool.kind === 'write' ? accent : 'var(--fg-3)',
                  flexShrink: 0,
                }}
              >
                {tool.kind}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                  {tool.name}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45 }}>
                  {t(tool.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
          <a
            href="https://github.com/paunrv/fermentrack/blob/main/docs/PROOF-BYOA-MCP.md"
            target="_blank"
            rel="noreferrer"
            style={{ color: accent }}
          >
            {t('catalogLink')}
          </a>
          {' · '}
          <a
            href="https://github.com/paunrv/fermentrack/blob/main/docs/PROOF-BYOA-MIGRATION.md"
            target="_blank"
            rel="noreferrer"
            style={{ color: accent }}
          >
            {t('migrationGuide')}
          </a>
          {' · '}
          <a
            href="https://github.com/paunrv/fermentrack/blob/main/docs/PROOF-BYOA-CUTOVER-CHECKLIST.md"
            target="_blank"
            rel="noreferrer"
            style={{ color: accent }}
          >
            {t('cutoverChecklist')}
          </a>
        </p>
      </section>

      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
          {t('promptsTitle')}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
          {prompts.map(key => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
          {t('manualTitle')}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {manualLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: '8px 14px',
                borderRadius: 999,
                border: '0.5px solid var(--hairline)',
                background: 'var(--panel)',
                color: 'var(--fg-0)',
                textDecoration: 'none',
              }}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
