import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel
  children: ReactNode
}

const headingClass: Record<HeadingLevel, string> = {
  h1: 'ui-h1',
  h2: 'ui-h2',
  h3: 'ui-h3',
  h4: 'ui-h4',
}

export function Heading({ as: Tag = 'h2', className, children, ...props }: HeadingProps) {
  return (
    <Tag className={cn('ui-heading', headingClass[Tag], className)} {...props}>
      {children}
    </Tag>
  )
}

export function Text({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('ui-text', className)} {...props}>
      {children}
    </p>
  )
}

export function Caption({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('ui-caption', className)} {...props}>
      {children}
    </p>
  )
}

export function Code({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <code className={cn('ui-code', className)} {...props}>
      {children}
    </code>
  )
}

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
}

export function Link({ className, children, ...props }: LinkProps) {
  return (
    <a className={cn('ui-link', className)} {...props}>
      {children}
    </a>
  )
}
