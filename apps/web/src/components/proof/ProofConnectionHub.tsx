'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import {
  ContentCard,
  CopyField,
  PageFrame,
  PageHeader,
  SetupAccordion,
} from '@fermentrack/ui'
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

function SecondaryButton({
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
      className="ui-copy-field__button"
      style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span aria-hidden="true">⎘</span>
      {copied ? copiedLabel : label}
    </button>
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
  const [advancedOpen, setAdvancedOpen] = useState(false)
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
    <PageFrame narrow className="proof-connection-hub" style={{ overflow: 'auto' }}>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--fg-3)' }}>
        {t('scopeNote')}
      </p>

      <ContentCard>
        <CopyField
          label={t('mcpUrl')}
          value={mcpUrl}
          copyLabel={t('copyUrl')}
          copiedLabel={t('copied')}
          onCopy={async () => {
            await copyMcpUrl()
          }}
        />

        <div>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--fg-0)',
            }}
          >
            {t('setupTitle')}
          </h2>

          <SetupAccordion title={t('clients.chatgpt')} defaultOpen>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{t('clients.chatgptStep1')}</li>
              <li>{t('clients.chatgptStep2')}</li>
              <li>{t('clients.chatgptStep3')}</li>
            </ol>
          </SetupAccordion>

          <SetupAccordion title={t('clients.claude')}>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{t('clients.claudeStep1')}</li>
              <li>{t('clients.claudeStep2')}</li>
              <li>{t('clients.claudeStep3')}</li>
              <li>{t('clients.claudeStep4')}</li>
            </ol>
            {isSignedIn ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <SecondaryButton
                  label={tokenDownloaded ? t('tokenDownloaded') : t('downloadToken')}
                  copiedLabel={t('tokenDownloaded')}
                  onClick={downloadAccessToken}
                  copied={tokenDownloaded}
                />
                <SecondaryButton
                  label={t('copyClaudeConfig')}
                  copiedLabel={t('copied')}
                  onClick={copyClaudeConfig}
                  copied={claudeConfigCopied}
                />
              </div>
            ) : null}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
              {t('clients.claudeConfigPath', { path: claudeConfigPath })}
            </p>
          </SetupAccordion>

          <SetupAccordion title={t('clients.cursor')}>
            <p style={{ margin: 0 }}>{t('clients.cursorHint')}</p>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{t('clients.cursorStep1')}</li>
              <li>{t('clients.cursorStep2')}</li>
              <li>{t('clients.cursorStep3')}</li>
            </ol>
            {isSignedIn ? (
              <SecondaryButton
                label={t('copyCursorConfig')}
                copiedLabel={t('copied')}
                onClick={copyCursorConfig}
                copied={configCopied}
              />
            ) : null}
          </SetupAccordion>

          <SetupAccordion title={t('clients.grok')}>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{t('clients.grokStep1')}</li>
              <li>{t('clients.grokStep2')}</li>
              <li>{t('clients.grokStep3')}</li>
            </ol>
          </SetupAccordion>
        </div>
      </ContentCard>

      <section>
        <button
          type="button"
          onClick={() => setAdvancedOpen(open => !open)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 0',
            border: 'none',
            borderTop: '1px solid var(--hairline)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--fg-2)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <span>{t('advancedTitle')}</span>
          <span aria-hidden="true" style={{ fontSize: 16 }}>
            {advancedOpen ? '▾' : '›'}
          </span>
        </button>

        {advancedOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 8 }}>
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

            {isSignedIn ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <SecondaryButton
                  label={t('copyToken')}
                  copiedLabel={t('copied')}
                  onClick={copyAccessToken}
                  copied={tokenCopied}
                />
                <SecondaryButton
                  label={tokenDownloaded ? t('tokenDownloaded') : t('downloadToken')}
                  copiedLabel={t('tokenDownloaded')}
                  onClick={downloadAccessToken}
                  copied={tokenDownloaded}
                />
                <SecondaryButton
                  label={testLoading ? t('testing') : t('testConnection')}
                  copiedLabel={t('copied')}
                  onClick={testConnection}
                  copied={false}
                  disabled={testLoading}
                />
              </div>
            ) : null}

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

            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
                {t('toolsTitle')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tools.map(tool => (
                  <div
                    key={tool.name}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--hairline)',
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
                            : 'var(--surface-muted)',
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
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
                {t('promptsTitle')}
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: 'var(--fg-2)',
                  lineHeight: 1.6,
                }}
              >
                {prompts.map(key => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
                {t('manualTitle')}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {manualLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-card)',
                      color: 'var(--fg-0)',
                      textDecoration: 'none',
                    }}
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>
            </div>

            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--fg-3)',
                  marginBottom: 8,
                }}
              >
                {t('clients.configPreview')}
              </summary>
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.45,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-muted)',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {claudeConfig}
              </pre>
              <pre
                style={{
                  margin: '8px 0 0',
                  fontSize: 11,
                  lineHeight: 1.45,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-muted)',
                  overflow: 'auto',
                  maxHeight: 180,
                }}
              >
                {cursorConfig}
              </pre>
            </details>
          </div>
        ) : null}
      </section>
    </PageFrame>
  )
}
