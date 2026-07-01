import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
  children: ReactNode
}

export function Container({ size = 'lg', className, children, ...props }: ContainerProps) {
  return (
    <div className={cn('ui-container', `ui-container--${size}`, className)} {...props}>
      {children}
    </div>
  )
}

export type Gap = 1 | 2 | 3 | 4 | 6

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap
  children: ReactNode
}

export function Stack({ gap = 3, className, children, ...props }: StackProps) {
  return (
    <div className={cn('ui-stack', `ui-gap-${gap}`, className)} {...props}>
      {children}
    </div>
  )
}

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap
  children: ReactNode
}

export function Inline({ gap = 2, className, children, ...props }: InlineProps) {
  return (
    <div className={cn('ui-inline', `ui-gap-${gap}`, className)} {...props}>
      {children}
    </div>
  )
}

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PageShell({ className, children, ...props }: PageShellProps) {
  return (
    <div className={cn('ui-page-shell', className)} {...props}>
      {children}
    </div>
  )
}

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  breadcrumb?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('ui-page-header', className)}>
      <div className="ui-page-header__main">
        {breadcrumb}
        <h1 className="ui-page-header__title">{title}</h1>
        {description ? <p className="ui-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  )
}

export interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('ui-empty', className)}>
      {icon}
      <p className="ui-empty__title">{title}</p>
      {description ? <p className="ui-empty__description">{description}</p> : null}
      {action}
    </div>
  )
}

export interface SectionProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Section({ title, children, defaultOpen = true, className }: SectionProps) {
  return (
    <details className={cn('ui-section', className)} open={defaultOpen}>
      <summary className="ui-section__trigger">{title}</summary>
      <div className="ui-section__content">{children}</div>
    </details>
  )
}
