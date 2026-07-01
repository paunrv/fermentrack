'use client'

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Sidebar({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside className={cn('ui-sidebar', className)} {...props}>
      {children}
    </aside>
  )
}

export function SidebarHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-sidebar__header', className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-sidebar__content', className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-sidebar__footer', className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {label ? <div className="ui-sidebar__group-label">{label}</div> : null}
      {children}
    </div>
  )
}

export interface SidebarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  asChild?: false
}

export interface SidebarItemLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean
  asChild?: true
}

export function SidebarItem({
  active,
  className,
  children,
  ...props
}: SidebarItemProps | (SidebarItemLinkProps & { href: string })) {
  const classes = cn('ui-sidebar__item', active && 'ui-sidebar__item--active', className)

  if ('href' in props && props.href) {
    const { href, ...rest } = props as SidebarItemLinkProps & { href: string }
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={classes} {...(props as SidebarItemProps)}>
      {children}
    </button>
  )
}

export function Topbar({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <header className={cn('ui-topbar', className)} {...props}>
      {children}
    </header>
  )
}

export interface BreadcrumbItem {
  label: ReactNode
  href?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn('ui-breadcrumb', className)}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} style={{ display: 'contents' }}>
              {index > 0 ? <span className="ui-breadcrumb__sep" aria-hidden>/</span> : null}
              {isLast || !item.href ? (
                <span className="ui-breadcrumb__current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="ui-breadcrumb__link">
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const active = items.find(item => item.value === value) ?? items[0]

  return (
    <div className={className}>
      <div className="ui-tabs__list" role="tablist">
        {items.map(item => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            className={cn('ui-tabs__trigger', value === item.value && 'ui-tabs__trigger--active')}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ui-tabs__content" role="tabpanel">
        {active?.content}
      </div>
    </div>
  )
}
