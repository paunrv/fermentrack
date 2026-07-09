'use client'

import { useCallback, useState, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface PageFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Narrow column (e.g. Connect hub ~640px). Default: 1280px. */
  narrow?: boolean
}

/** Desktop page wrapper: gray `--page-bg` + centered column. */
export function PageFrame({ narrow = false, className, children, ...props }: PageFrameProps) {
  return (
    <div
      className={cn('ui-page-frame', narrow && 'ui-page-frame--narrow', className)}
      {...props}
    >
      <div className="ui-page-frame__inner">{children}</div>
    </div>
  )
}

export interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** Primary white surface on a VU page. */
export function ContentCard({ className, children, ...props }: ContentCardProps) {
  return (
    <div className={cn('ui-content-card', className)} {...props}>
      {children}
    </div>
  )
}

export interface CopyFieldProps {
  label: ReactNode
  value: string
  copyLabel?: string
  copiedLabel?: string
  onCopy?: (value: string) => void | Promise<void>
  className?: string
  disabled?: boolean
}

/** Read-only value row with Copy — Connect URL pattern. */
export function CopyField({
  label,
  value,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  onCopy,
  className,
  disabled,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (disabled) return
    if (onCopy) {
      await onCopy(value)
    } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [disabled, onCopy, value])

  return (
    <div className={cn('ui-copy-field', className)}>
      <p className="ui-copy-field__label">{label}</p>
      <div className="ui-copy-field__row">
        <code className="ui-copy-field__value">{value}</code>
        <button
          type="button"
          className="ui-copy-field__button"
          disabled={disabled}
          onClick={() => void handleCopy()}
        >
          <span aria-hidden="true">⎘</span>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  )
}

export interface SetupAccordionProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * Expandable setup row (VU Connect pattern).
 * Allowed on `/dashboard/conectar` and mobile; avoid on other desktop pages.
 */
export function SetupAccordion({
  title,
  children,
  defaultOpen = false,
  className,
}: SetupAccordionProps) {
  return (
    <details className={cn('ui-setup-accordion', className)} open={defaultOpen}>
      <summary className="ui-setup-accordion__summary">
        <span>{title}</span>
        <span aria-hidden="true" className="ui-setup-accordion__chevron">
          ›
        </span>
      </summary>
      <div className="ui-setup-accordion__body">{children}</div>
    </details>
  )
}
