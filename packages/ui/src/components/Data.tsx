'use client'

import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export function TableWrap({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-table-wrap', className)} {...props}>
      {children}
    </div>
  )
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('ui-table', className)} {...props}>
      {children}
    </table>
  )
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={className} {...props}>
      {children}
    </td>
  )
}

export interface ChipProps {
  children: ReactNode
  onRemove?: () => void
  className?: string
}

export function Chip({ children, onRemove, className }: ChipProps) {
  return (
    <span className={cn('ui-chip', className)}>
      {children}
      {onRemove ? (
        <button type="button" className="ui-chip__remove" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      ) : null}
    </span>
  )
}
