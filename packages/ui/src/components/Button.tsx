import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn, type Size } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="ui-spinner ui-spinner--sm" aria-hidden /> : null}
      {children}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  size?: Size
  variant?: Exclude<ButtonVariant, 'link'>
  children: ReactNode
}

export function IconButton({
  size = 'md',
  variant = 'ghost',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn('ui-btn', 'ui-btn--icon', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      {...props}
    >
      {children}
    </button>
  )
}
