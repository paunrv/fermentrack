'use client'

import Link from 'next/link'
import type { PedidoWithItems, RemisionDistribuidorRow } from '@/lib/supabase'
import { fmtMoney } from '@/lib/proof/format'
import { formatLineaToma, type TomaPedidoNotas } from '@/lib/proof/toma-pedido-client'
import { RemisionPedidoActions } from '@/components/proof/RemisionPedidoActions'

type Props = {
  pedido: PedidoWithItems
  toma: TomaPedidoNotas
  remision?: RemisionDistribuidorRow | null
}

export function PedidoTomaDetalle({ pedido, toma, remision }: Props) {
  const cliente = pedido.clients?.name ?? 'Cliente'
  const confirmado = pedido.estado !== 'borrador'

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link
        href="/dashboard/pedidos/nuevo"
        style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
      >
        ← Toma de pedidos
      </Link>

      <header style={{ margin: '16px 0 24px' }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>
          {pedido.numero}
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: 'var(--fg-0)' }}>
          {cliente}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>
          Entrega {pedido.fecha_entrega}
          {' · '}
          <span style={{ color: confirmado ? 'var(--ok)' : 'var(--warn)' }}>{pedido.estado}</span>
          {toma.anticipo && (
            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
              {' · Anticipo'}
              {toma.anticipo_monto != null && toma.anticipo_monto > 0
                ? ` ${fmtMoney(toma.anticipo_monto)}`
                : ''}
            </span>
          )}
        </p>
      </header>

      <section
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 12,
          background: 'var(--panel)',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          className="eyebrow"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}
        >
          Productos pedidos
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {toma.lineas.map((l, i) => (
            <li
              key={`${l.etiqueta}-${i}`}
              style={{
                padding: '14px 16px',
                borderBottom: i < toma.lineas.length - 1 ? '1px solid var(--hairline)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-0)' }}>{l.etiqueta}</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                {formatLineaToma(l)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {pedido.items_pedido.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20, lineHeight: 1.5 }}>
          Pedido registrado por etiqueta. Cuando ligues SKUs en inventario, el stock se reservará al
          confirmar desde catálogo.
        </p>
      )}

      <RemisionPedidoActions
        pedidoId={pedido.id}
        estado={pedido.estado}
        initialRemision={
          remision
            ? {
                numero: remision.numero_remision,
                hasPdf: Boolean(remision.pdf_url?.trim()),
                downloadUrl: null,
              }
            : null
        }
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/pedidos/nuevo"
          style={{
            padding: '12px 18px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}
        >
          + Otro pedido
        </Link>
        <Link
          href="/dashboard/pedidos"
          style={{
            padding: '12px 18px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            color: 'var(--fg-1)',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}
        >
          Ver todos
        </Link>
      </div>
    </div>
  )
}
