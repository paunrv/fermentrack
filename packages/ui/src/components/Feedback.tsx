import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('ui-badge', `ui-badge--${variant}`, className)} {...props}>
      {children}
    </span>
  )
}

export type AlertVariant = 'info' | 'warning' | 'error'

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant
  title?: ReactNode
  children?: ReactNode
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  return (
    <div className={cn('ui-alert', `ui-alert--${variant}`, className)} role="alert" {...props}>
      <div>
        {title ? <p className="ui-alert__title">{title}</p> : null}
        {children ? <p className="ui-alert__body">{children}</p> : null}
      </div>
    </div>
  )
}

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <span
      className={cn('ui-spinner', size !== 'md' && `ui-spinner--${size}`, className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

export function Skeleton({ width = '100%', height = 16, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('ui-skeleton', className)}
      style={{ width, height, ...style }}
      aria-hidden
      {...props}
    />
  )
}
