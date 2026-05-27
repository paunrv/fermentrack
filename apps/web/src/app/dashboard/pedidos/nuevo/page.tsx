'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { fetchClients, type Client } from '@/lib/supabase'
import { useSupabase } from '@/hooks/useSupabase'
import { createPedidoDraftAction } from '@/app/actions/pedidos'

export default function NuevoPedidoPage() {
  const router = useRouter()
  const { scope, activeProfile } = useProfile()
  const supabase = useSupabase()
  const [clients, setClients] = useState<Client[]>([])
  const [clienteId, setClienteId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().slice(0, 10))
  const [condicion, setCondicion] = useState('30 días crédito')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scope) return
    fetchClients(supabase, scope).then(setClients).catch(() => setClients([]))
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId || !scope) return
    setSaving(true)
    setError(null)
    try {
      const pedido = await createPedidoDraftAction({
        cliente_id: clienteId,
        fecha_entrega: fechaEntrega,
        condicion_pago: condicion,
        profile_type_v2: activeProfile?.profile_type_v2 || 'distributor',
      })
      router.push(`/dashboard/pedidos/${pedido.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 520, margin: '0 auto' }}>
      <Link href="/dashboard/pedidos" style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}>
        ← Pedidos
      </Link>
      <h1 style={{ margin: '16px 0 24px', fontSize: 24, fontWeight: 800, color: 'var(--fg-0)' }}>
        Nuevo pedido
      </h1>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Cliente</span>
          <select
            required
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Seleccionar…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Fecha entrega</span>
          <input
            type="date"
            required
            value={fechaEntrega}
            onChange={e => setFechaEntrega(e.target.value)}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Condición de pago</span>
          <input
            type="text"
            value={condicion}
            onChange={e => setCondicion(e.target.value)}
            style={fieldStyle}
          />
        </label>
        {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--crit)' }}>{error}</p>}
        <button type="submit" disabled={saving || !clienteId} style={ctaStyle}>
          {saving ? 'Creando…' : 'Abrir compositor'}
        </button>
      </form>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'var(--panel)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--fg-0)',
  fontSize: 14,
}

const ctaStyle: React.CSSProperties = {
  padding: '12px 18px',
  background: 'var(--gold)',
  border: 'none',
  color: 'var(--ink)',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
