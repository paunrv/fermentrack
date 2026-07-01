'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface ToastItem {
  id: string
  message: ReactNode
}

interface ToastContextValue {
  toast: (message: ReactNode) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const toast = useCallback((message: ReactNode) => {
    const id = crypto.randomUUID()
    setItems(prev => [...prev, { id, message }])
    window.setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" aria-live="polite">
        {items.map(item => (
          <div key={item.id} className="ui-toast">
            <span>{item.message}</span>
            <button type="button" className="ui-toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastViewport({ className }: { className?: string }) {
  return <div className={cn('ui-toast-region', className)} aria-live="polite" />
}
