import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('ui-card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-card__header', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('ui-card__title', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('ui-card__description', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-card__content', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-card__footer', className)} {...props}>
      {children}
    </div>
  )
}

export function Separator({
  orientation = 'horizontal',
  className,
  ...props
}: HTMLAttributes<HTMLHRElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <hr
      className={cn('ui-separator', orientation === 'vertical' && 'ui-separator--vertical', className)}
      {...props}
    />
  )
}
