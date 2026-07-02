import {
  executeDistributorAgentAction,
  type DistributorAgentAction,
} from '@/lib/proof/distributor-agent-actions'
import type { UnidadPedido } from '@/lib/proof/toma-pedido-client'
import {
  clearRecepcionLineItems,
  confirmarLlegadaOrdenCompraDistribuidor,
  createRecepcionDraft,
  fetchDetalleClienteCredito,
  insertDiscrepancias,
  insertItemsRecepcion,
  rpcProofNextCodigo,
  updateRecepcionDraft,
  type ConfirmarLlegadaOcLinea,
} from '@/lib/supabase/distribuidor'
import { recepcionDraftSchema } from '@/lib/mcp/schemas/recepcion-draft'
import type { McpWriteInput } from '@/lib/mcp/write-helpers'
import { withMcpWriteScope } from '@/lib/mcp/write-helpers'

function scopeInput(input?: McpWriteInput) {
  const { idempotency_key: _k, ...scope } = input ?? {}
  return scope
}

async function runDistributorAction(
  toolName: string,
  input: McpWriteInput | undefined,
  action: DistributorAgentAction
) {
  return withMcpWriteScope(toolName, input, 'distributor', async ({ sb, userId, scope }) => {
    const distributorScope = scope.distributorScope!
    const result = await executeDistributorAgentAction(sb, userId, distributorScope, action)
    return result
  })
}

export async function createPedidoTool(
  input: McpWriteInput & {
    cliente: string
    etiqueta: string
    cantidad: number
    unidad: UnidadPedido
    sku_id?: string | null
    anticipo?: boolean
    anticipo_monto?: number | null
  }
) {
  return runDistributorAction('create_pedido', input, {
    type: 'crear_toma_pedido',
    cliente: input.cliente,
    etiqueta: input.etiqueta,
    cantidad: input.cantidad,
    unidad: input.unidad,
    sku_id: input.sku_id ?? null,
    anticipo: input.anticipo ?? false,
    anticipo_monto: input.anticipo_monto ?? null,
  })
}

export async function confirmarEntregaTool(
  input: McpWriteInput & { pedido_id: string; sku_id?: string | null }
) {
  return runDistributorAction('confirmar_entrega', input, {
    type: 'confirmar_entrega',
    pedido_id: input.pedido_id,
    sku_id: input.sku_id ?? null,
  })
}

export async function createOrdenCompraTool(
  input: McpWriteInput & {
    proveedor: string
    producto: string
    cantidad: number
    costo?: number
  }
) {
  return runDistributorAction('create_orden_compra', input, {
    type: 'crear_orden_compra',
    proveedor: input.proveedor,
    producto: input.producto,
    cantidad: input.cantidad,
    costo: input.costo,
  })
}

export async function confirmarRecepcionTool(
  input: McpWriteInput & {
    orden_id: string
    lineas: ConfirmarLlegadaOcLinea[]
    proveedor: string
    producto_resumen: string
    total_recibido: number
  }
) {
  return runDistributorAction('confirmar_recepcion', input, {
    type: 'confirmar_llegada_distribuidor',
    orden_id: input.orden_id,
    lineas: input.lineas,
    proveedor: input.proveedor,
    producto_resumen: input.producto_resumen,
    total_recibido: input.total_recibido,
  })
}

export async function registrarPagoClienteTool(
  input: McpWriteInput & {
    cuenta_id: string
    monto: number
    cliente_nombre: string
  }
) {
  return runDistributorAction('registrar_pago_cliente', input, {
    type: 'registrar_pago',
    cuenta_id: input.cuenta_id,
    monto: input.monto,
    cliente_nombre: input.cliente_nombre,
  })
}

export async function editarSkuTool(
  input: McpWriteInput & {
    sku_id: string
    nombre: string
    categoria_liquido?: 'mezcal' | 'destilado' | 'gin' | 'vino' | 'cerveza' | 'otro'
    precio_venta?: number
  }
) {
  return runDistributorAction('editar_sku', input, {
    type: 'editar_sku',
    sku_id: input.sku_id,
    nombre: input.nombre,
    categoria_liquido: input.categoria_liquido,
    precio_venta: input.precio_venta,
  })
}

export async function importRecepcionDraftTool(
  input: McpWriteInput & { draft: unknown }
) {
  const parsed = recepcionDraftSchema.safeParse(input.draft)
  if (!parsed.success) {
    throw new Error(`Invalid recepción draft: ${parsed.error.issues.map(i => i.message).join('; ')}`)
  }
  const draft = parsed.data

  return withMcpWriteScope('import_recepcion_draft', input, 'distributor', async ({ sb, scope }) => {
    const distributorScope = scope.distributorScope!
    let rec

    if (draft.recepcion_id) {
      rec = await updateRecepcionDraft(sb, draft.recepcion_id, {
        productor: draft.productor,
        orden_compra_id: draft.orden_compra_id,
        orden_compra_distribuidor_id: draft.orden_compra_distribuidor_id,
        costo_total: draft.costo_total,
        deuda_registrada: draft.deuda_registrada,
        ...(draft.foto_urls?.length ? { foto_urls: draft.foto_urls } : {}),
      })
      await clearRecepcionLineItems(sb, rec.id)
    } else {
      const codigo = await rpcProofNextCodigo(
        sb,
        distributorScope.user_id,
        distributorScope.profile_type_v2,
        'recepcion'
      )
      rec = await createRecepcionDraft(sb, {
        codigo,
        productor: draft.productor,
        bodega_destino: draft.bodega_destino,
        orden_compra_id: draft.orden_compra_id,
        orden_compra_distribuidor_id: draft.orden_compra_distribuidor_id,
        costo_total: draft.costo_total,
        deuda_registrada: draft.deuda_registrada,
        foto_urls: draft.foto_urls,
        user_id: distributorScope.user_id,
        profile_type_v2: distributorScope.profile_type_v2,
      })
    }

    await insertItemsRecepcion(
      sb,
      draft.items.map(it => ({
        recepcion_id: rec.id,
        sku_id: it.sku_id ?? null,
        cantidad_esperada: it.cantidad_esperada,
        cantidad_recibida: it.cantidad_recibida,
        lote: it.lote,
        condicion: it.condicion,
      }))
    )

    if (draft.discrepancias.length > 0) {
      await insertDiscrepancias(
        sb,
        draft.discrepancias.map(d => ({
          recepcion_id: rec.id,
          sku_id: d.sku_id ?? null,
          tipo: d.tipo,
          descripcion: d.descripcion,
          cantidad_afectada: d.cantidad_afectada,
        }))
      )
    }

    return {
      ok: true,
      recepcion_id: rec.id,
      codigo: rec.codigo,
      estado: rec.estado,
      items: draft.items.length,
    }
  })
}

export async function getCobroContextTool(
  input: McpWriteInput & { cliente_nombre: string }
) {
  return withMcpWriteScope('get_cobro_context', scopeInput(input), 'distributor', async ({ sb, scope }) => {
    const detail = await fetchDetalleClienteCredito(
      sb,
      input.cliente_nombre,
      scope.distributorScope!
    )
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const cuentas = detail.cuentas.map(c => {
      const vencida =
        c.estado === 'vencida' ||
        (c.fecha_vencimiento != null && c.fecha_vencimiento < today)
      const diasVencido =
        vencida && c.fecha_vencimiento
          ? Math.max(
              0,
              Math.floor(
                (Date.parse(today) - Date.parse(c.fecha_vencimiento)) / (1000 * 60 * 60 * 24)
              )
            )
          : 0
      return {
        id: c.id,
        pedido_id: c.pedido_id,
        pedido_numero: c.pedidos?.numero ?? null,
        saldo_pendiente: Number(c.saldo_pendiente),
        monto_total: Number(c.monto_total),
        estado: c.estado,
        fecha_vencimiento: c.fecha_vencimiento,
        dias_vencido: diasVencido,
      }
    })
    const totalPorCobrar = cuentas.reduce((s, c) => s + c.saldo_pendiente, 0)
    return {
      cliente_nombre: detail.cliente_nombre,
      total_por_cobrar: totalPorCobrar,
      cuentas,
      pagos_recientes: detail.pagos.slice(0, 5).map(p => ({
        monto: Number(p.monto),
        fecha_pago: p.fecha_pago,
        cuenta_id: p.cuenta_por_cobrar_id,
      })),
      drafting_hints: {
        tono_sugerido: cuentas.some(c => c.dias_vencido > 14) ? 'firme' : 'suave',
        pedido_referencia: cuentas[0]?.pedido_numero ?? null,
      },
    }
  })
}

/** Direct OC confirm helper (same DB path as agent action, exposed for structured MCP calls). */
export async function confirmarLlegadaOcTool(
  input: McpWriteInput & { orden_id: string; lineas: ConfirmarLlegadaOcLinea[] }
) {
  return withMcpWriteScope('confirmar_llegada_oc', input, 'distributor', async ({ sb }) => {
    await confirmarLlegadaOrdenCompraDistribuidor(sb, input.orden_id, input.lineas)
    return { ok: true, orden_id: input.orden_id, lineas: input.lineas.length }
  })
}
