import type { HTMLAttributes, ImgHTMLAttributes } from 'react'
import { cn, type Size } from '../lib/cn'

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string
  alt?: string
  fallback: string
  size?: Size
}

export function Avatar({ src, alt, fallback, size = 'md', className, ...props }: AvatarProps) {
  const initials = fallback.slice(0, 2).toUpperCase()

  return (
    <span className={cn('ui-avatar', `ui-avatar--${size}`, className)} {...props}>
      {src ? <img src={src} alt={alt ?? fallback} /> : initials}
    </span>
  )
}

export type AvatarImageProps = ImgHTMLAttributes<HTMLImageElement>
