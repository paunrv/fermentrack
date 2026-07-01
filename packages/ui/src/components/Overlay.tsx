'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cn('ui-dialog', className)}
      onClose={() => onOpenChange(false)}
      onClick={e => {
        if (e.target === ref.current) onOpenChange(false)
      }}
    >
      <div className="ui-dialog__header">
        <h2 className="ui-dialog__title">{title}</h2>
        {description ? <p className="ui-dialog__description">{description}</p> : null}
      </div>
      {children ? <div className="ui-dialog__body">{children}</div> : null}
      {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
    </dialog>
  )
}

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'left' | 'right'
  title?: ReactNode
  children: ReactNode
  className?: string
}

export function Sheet({ open, onOpenChange, side = 'right', title, children, className }: SheetProps) {
  if (!open) return null

  return (
    <>
      <div className="ui-sheet-overlay" onClick={() => onOpenChange(false)} aria-hidden />
      <div className={cn('ui-sheet', side === 'left' ? 'ui-sheet--left' : 'ui-sheet--right', className)} role="dialog">
        {title ? (
          <div className="ui-sheet__header">
            <h2 className="ui-dialog__title">{title}</h2>
          </div>
        ) : null}
        <div className="ui-sheet__body">{children}</div>
      </div>
    </>
  )
}

export interface DropdownMenuItem {
  label: ReactNode
  onSelect?: () => void
  disabled?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownMenuItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function DropdownMenu({ trigger, items, open, onOpenChange, className }: DropdownMenuProps) {
  const isControlled = open !== undefined
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isControlled || !open) return
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) onOpenChange?.(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [isControlled, open, onOpenChange])

  return (
    <div className={cn('ui-dropdown', className)} ref={menuRef}>
      <div onClick={() => onOpenChange?.(!open)}>{trigger}</div>
      {(isControlled ? open : undefined) !== false && isControlled && open ? (
        <div className="ui-dropdown__menu" role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className="ui-dropdown__item"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect?.()
                onOpenChange?.(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <span className="ui-tooltip-wrap">
      {children}
      <span className="ui-tooltip" role="tooltip">
        {content}
      </span>
    </span>
  )
}

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function Popover({ trigger, children, open, onOpenChange, className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onOpenChange])

  return (
    <div className={cn('ui-popover', className)} ref={ref}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open ? <div className="ui-popover__content">{children}</div> : null}
    </div>
  )
}
