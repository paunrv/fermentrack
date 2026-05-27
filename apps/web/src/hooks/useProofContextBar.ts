'use client'

import { useEffect, useRef, useState } from 'react'

export function useProofContextBar(options: {
  pantalla: string
  vista?: string
  contexto?: Record<string, unknown>
  enabled?: boolean
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
}) {
  const [mensaje, setMensaje] = useState(options.fallback?.mensaje ?? '…')
  const [accionLabel, setAccionLabel] = useState(options.fallback?.accionLabel ?? 'Ver más')
  const [accionHref, setAccionHref] = useState(options.fallback?.accionHref ?? '/dashboard/agente')
  const [loading, setLoading] = useState(Boolean(options.enabled !== false))
  const keyRef = useRef('')

  useEffect(() => {
    if (options.enabled === false) return

    const key = JSON.stringify({
      pantalla: options.pantalla,
      vista: options.vista,
      contexto: options.contexto,
    })
    if (key === keyRef.current) return
    keyRef.current = key

    let cancelled = false
    setLoading(true)
  setMensaje('')

    void (async () => {
      try {
        const res = await fetch('/api/proof/contexto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pantalla: options.pantalla,
            vista: options.vista,
            contexto: options.contexto,
          }),
        })
        if (!res.ok || !res.body) throw new Error('contexto failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamed = ''

        while (true) {
          const { done, value } = await reader.read()
          if (cancelled) return
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            const line = part.split('\n').find(l => l.startsWith('data: '))
            if (!line) continue
            try {
              const payload = JSON.parse(line.slice(6)) as {
                text?: string
                mensaje?: string
                accionLabel?: string
                accionHref?: string
              }
              if (payload.text) {
                streamed += payload.text
                setMensaje(
                  streamed
                    .replace(/^\s*\{[^}]*"mensaje"\s*:\s*"?/, '')
                    .replace(/"?\s*,?\s*"accionLabel[\s\S]*$/, '')
                )
              }
              if (payload.mensaje) {
                setMensaje(payload.mensaje)
                if (payload.accionLabel) setAccionLabel(payload.accionLabel)
                if (payload.accionHref) setAccionHref(payload.accionHref)
              }
            } catch {
              /* partial json */
            }
          }
        }
      } catch {
        if (!cancelled && options.fallback) {
          setMensaje(options.fallback.mensaje)
          setAccionLabel(options.fallback.accionLabel ?? 'Ver más')
          setAccionHref(options.fallback.accionHref ?? '/dashboard/agente')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [options.pantalla, options.vista, options.contexto, options.enabled])

  return { mensaje, accionLabel, accionHref, loading }
}
