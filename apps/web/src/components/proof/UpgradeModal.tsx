'use client'

import Link from 'next/link'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'

interface UpgradeModalContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null)

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  )

  return (
    <UpgradeModalContext.Provider value={value}>
      {children}
      {isOpen && <UpgradeModalPanel onClose={close} />}
    </UpgradeModalContext.Provider>
  )
}

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext)
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider')
  return ctx
}

function UpgradeModalPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations('landing.upgradeModal')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label={t('closeAria')}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'rgba(55, 53, 47, 0.45)',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          padding: 28,
          borderRadius: 'var(--radius-card)',
          background: 'var(--ink)',
          border: '1px solid var(--hairline)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12 }} aria-hidden>
          🔒
        </div>
        <h2
          id="upgrade-modal-title"
          style={{
            margin: '0 0 12px',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--fg-0)',
            lineHeight: 1.3,
          }}
        >
          {t('title')}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.55, color: 'var(--fg-2)' }}>
          {t('body')}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            style={{
              flex: 1,
              minWidth: 140,
              textAlign: 'center',
              padding: '10px 16px',
              background: 'var(--purple)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {t('seePlans')} →
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 16px',
              background: 'var(--panel-2)',
              color: 'var(--fg-0)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('stayBasic')}
          </button>
        </div>
      </div>
    </div>
  )
}
