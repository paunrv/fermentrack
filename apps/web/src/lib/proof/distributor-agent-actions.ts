import type { SupabaseClient } from '@supabase/supabase-js'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import type { ProfileScope } from '@/lib/supabase'
import { rpcEntregarPedido } from '@/lib/supabase/distribuidor'

export type DistributorAgentActionType =
  | 'confirmar_entrega'
  | 'registrar_pago'
  | 'actualizar_precio'
  | 'agregar_nota'

export type DistributorAgentAction =
  | { type: 'confirmar_entrega'; pedido_id: string }
  | {
      type: 'registrar_pago'
      cuenta_id: string
      monto: number
      cliente_nombre: string
    }
  | { type: 'actualizar_precio'; sku_id: string; precio: number; nombre: string }
  | { type: 'agregar_nota'; sku_id: string; nota: string; nombre: string }

function normQ(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function looksLikeDistributorMutation(q: string): boolean {
  const n = normQ(q)
  if (
    (n.includes('entregar') || n.includes('entregado') || n.includes('marcar')) &&
    (n.includes('pedido') || n.includes('entrega'))
  ) {
    return true
  }
  if (/\bpag[oó]\b/.test(n) || n.includes('registrar pago')) return true
  if (
    n.includes('precio') &&
    (n.includes('cambiar') || n.includes('actualizar') || n.includes('poner') || n.includes('a $'))
  ) {
    return true
  }
  if (n.includes('nota') || n.includes('anotar') || n.includes('comentario')) return true
  return false
}

function parsePrecioFromQuery(q: string): number | null {
  const m = q.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
  if (!m?.[1]) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseMontoFromQuery(q: string): number | null {
  const explicit = q.match(
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:pesos|mxn|de pago|de abono)?/
  )
  if (explicit?.[1]) {
    const n = Number(explicit[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  return parsePrecioFromQuery(q)
}

function resolveSku(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['skus'][number] | null {
  if (ctx.selectedSkuId) {
    const hit = ctx.skus.find(s => s.id === ctx.selectedSkuId)
    if (hit) return hit
  }
  const codigoMatch = q.match(/\b(sku[-\s]?\d+)\b/i)
  if (codigoMatch?.[1]) {
    const frag = codigoMatch[1].replace(/\s/g, '').toUpperCase()
    const byCode = ctx.skus.find(
      s =>
        s.codigo.toUpperCase() === frag ||
        s.codigo.toUpperCase().includes(frag.replace('SKU-', ''))
    )
    if (byCode) return byCode
  }
  let best: DistributorAgentContext['skus'][number] | null = null
  let bestLen = 0
  for (const s of ctx.skus) {
    const nombre = normQ(s.nombre)
    if (nombre.length < 3) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = s
      bestLen = nombre.length
    }
  }
  return best
}

function resolvePedido(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['pedidos'][number] | null {
  const numMatch = q.match(/pedido\s*#?\s*([\w-]+)/i) ?? q.match(/#([\w-]+)/)
  if (numMatch?.[1]) {
    const frag = numMatch[1].toUpperCase()
    const hit = ctx.pedidos.find(
      p =>
        p.numero.toUpperCase() === frag ||
        p.numero.toUpperCase().includes(frag)
    )
    if (hit) return hit
  }
  const uuidFrag = q.match(/\b([a-f0-9]{8,32})\b/i)
  if (uuidFrag?.[1]) {
    const frag = uuidFrag[1].toLowerCase()
    const hit = ctx.pedidos.find(
      p => p.id.toLowerCase().startsWith(frag) || p.id.toLowerCase().includes(frag)
    )
    if (hit) return hit
  }
  const confirmados = ctx.pedidos.filter(p => p.estado === 'confirmado')
  if (confirmados.length === 1) return confirmados[0]!
  return null
}

function resolveCuentaPorCliente(
  q: string,
  ctx: DistributorAgentContext
): (typeof ctx.credito.cuentas)[number] | null {
  let best: (typeof ctx.credito.cuentas)[number] | null = null
  let bestLen = 0
  for (const c of ctx.credito.cuentas) {
    const nombre = normQ(c.cliente_nombre)
    if (nombre.length < 2) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = c
      bestLen = nombre.length
    }
  }
  return best
}

export function parseDistributorActionIntent(
  query: string,
  ctx: DistributorAgentContext
): DistributorAgentAction | null {
  const q = normQ(query)

  if (
    (q.includes('entregar') || q.includes('entregado') || q.includes('marcar')) &&
    (q.includes('pedido') || q.includes('entrega'))
  ) {
    const pedido = resolvePedido(q, ctx)
    if (!pedido) return null
    if (!['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(pedido.estado)) {
      return null
    }
    return { type: 'confirmar_entrega', pedido_id: pedido.id }
  }

  if (
    /\bpag[oó]\b/.test(q) ||
    q.includes('registrar pago') ||
    (q.includes('registrar') && q.includes('pago'))
  ) {
    const cuenta = resolveCuentaPorCliente(q, ctx)
    if (!cuenta) return null
    const monto =
      parseMontoFromQuery(q) ?? cuenta.saldo_pendiente
    if (monto <= 0) return null
    return {
      type: 'registrar_pago',
      cuenta_id: cuenta.id,
      monto: Math.min(monto, cuenta.saldo_pendiente),
      cliente_nombre: cuenta.cliente_nombre,
    }
  }

  if (
    q.includes('precio') &&
    (q.includes('cambiar') ||
      q.includes('actualizar') ||
      q.includes('poner') ||
      q.includes('a $') ||
      q.includes('venta'))
  ) {
    const sku = resolveSku(q, ctx)
    const precio = parsePrecioFromQuery(q)
    if (!sku || precio == null) return null
    return {
      type: 'actualizar_precio',
      sku_id: sku.id,
      precio,
      nombre: sku.nombre,
    }
  }

  if (q.includes('nota') || q.includes('anotar') || q.includes('comentario')) {
    const sku = resolveSku(q, ctx)
    if (!sku) return null
    const notaMatch = query.match(/(?:nota|anotar|comentario)[:\s]+(.+)/i)
    const nota = notaMatch?.[1]?.trim()
    if (!nota) return null
    return {
      type: 'agregar_nota',
      sku_id: sku.id,
      nota,
      nombre: sku.nombre,
    }
  }

  return null
}

export async function executeDistributorAgentAction(
  sb: SupabaseClient,
  clerkId: string,
  scope: ProfileScope,
  action: DistributorAgentAction
): Promise<{ ok: true; message: string; entityId: string }> {
  switch (action.type) {
    case 'confirmar_entrega': {
      const { data: pedido, error: pedErr } = await sb
        .from('pedidos')
        .select('id, numero, estado')
        .eq('id', action.pedido_id)
        .eq('clerk_id', clerkId)
        .maybeSingle()
      if (pedErr) throw pedErr
      if (!pedido) throw new Error('Pedido no encontrado')
      if (pedido.estado === 'entregado') {
        throw new Error(`El pedido ${pedido.numero} ya está entregado`)
      }
      const updated = await rpcEntregarPedido(sb, action.pedido_id, false)
      return {
        ok: true,
        entityId: updated.id,
        message: `Pedido ${pedido.numero} marcado como entregado ✓`,
      }
    }
    case 'registrar_pago': {
      const { data: cuenta, error: cErr } = await sb
        .from('cuentas_clientes')
        .select('id, saldo_pendiente, cliente_id')
        .eq('id', action.cuenta_id)
        .eq('clerk_id', clerkId)
        .maybeSingle()
      if (cErr) throw cErr
      if (!cuenta) throw new Error('Cuenta de cliente no encontrada')
      const saldo = Number(cuenta.saldo_pendiente)
      const nuevo = Math.max(0, saldo - action.monto)
      const { error: upErr } = await sb
        .from('cuentas_clientes')
        .update({
          saldo_pendiente: nuevo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.cuenta_id)
        .eq('clerk_id', clerkId)
      if (upErr) throw upErr
      return {
        ok: true,
        entityId: action.cuenta_id,
        message: `Pago de $${action.monto.toLocaleString('es-MX')} registrado para ${action.cliente_nombre} ✓ Saldo: $${nuevo.toLocaleString('es-MX')}`,
      }
    }
    case 'actualizar_precio': {
      const { error: upErr } = await sb
        .from('skus')
        .update({
          precio_venta: action.precio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.sku_id)
        .eq('clerk_id', clerkId)
        .eq('profile_type_v2', scope.profile_type_v2)
      if (upErr) throw upErr
      return {
        ok: true,
        entityId: action.sku_id,
        message: `Precio de ${action.nombre} actualizado a $${action.precio.toLocaleString('es-MX')} ✓`,
      }
    }
    case 'agregar_nota': {
      const { error: upErr } = await sb
        .from('skus')
        .update({
          notas: action.nota,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.sku_id)
        .eq('clerk_id', clerkId)
        .eq('profile_type_v2', scope.profile_type_v2)
      if (upErr) {
        const msg = upErr.message ?? ''
        if (msg.includes('notas') && (msg.includes('schema cache') || msg.includes('PGRST204'))) {
          throw new Error(
            'Falta la columna notas en skus. Aplica la migración 20250527000000_skus_catalog_columns.sql'
          )
        }
        throw upErr
      }
      return {
        ok: true,
        entityId: action.sku_id,
        message: `Nota guardada en ${action.nombre} ✓`,
      }
    }
  }
}
