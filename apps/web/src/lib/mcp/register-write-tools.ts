import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  confirmarEntregaTool,
  confirmarRecepcionTool,
  createOrdenCompraTool,
  createPedidoTool,
  editarSkuTool,
  getCobroContextTool,
  importRecepcionDraftTool,
  registrarPagoClienteTool,
} from '@/lib/mcp/tools/distributor-write'
import { importWinemakerTicketTool, registrarSalidaTool, enviarMensajeTool, crearLoteTool, registrarEmbotelladoTool, cambiarEtapaLoteTool } from '@/lib/mcp/tools/winemaker-write'
import { LOT_ETAPA_VALUES } from '@/lib/proof/lot-etapa'
import { WM_BOTELLAS_POR_CAJA_VALUES } from '@/lib/proof/finished-goods-types'

const profileTypeSchema = z.enum(['distributor', 'winemaker', 'distiller']).optional()
const organizationIdSchema = z.string().uuid().optional()
const idempotencyKeySchema = z.string().min(8).max(128).optional()

const writeScopeFields = {
  profile_type: profileTypeSchema,
  organization_id: organizationIdSchema,
  idempotency_key: idempotencyKeySchema,
}

const ocLineaSchema = z.object({
  item_id: z.string().uuid(),
  cantidad_recibida: z.number().nonnegative(),
})

export function registerProofMcpWriteTools(server: McpServer): void {
  server.registerTool(
    'create_pedido',
    {
      title: 'Create sales order',
      description: 'Create a distributor pedido (toma de pedido).',
      inputSchema: {
        ...writeScopeFields,
        cliente: z.string().min(1),
        etiqueta: z.string().min(1),
        cantidad: z.number().positive(),
        unidad: z.enum(['botellas', 'cajas', 'latas']),
        sku_id: z.string().uuid().nullable().optional(),
        anticipo: z.boolean().optional(),
        anticipo_monto: z.number().positive().nullable().optional(),
      },
    },
    async input => createPedidoTool(input)
  )

  server.registerTool(
    'confirmar_entrega',
    {
      title: 'Confirm delivery',
      description: 'Mark a pedido as delivered and generate remisión when possible.',
      inputSchema: {
        ...writeScopeFields,
        pedido_id: z.string().uuid(),
        sku_id: z.string().uuid().nullable().optional(),
      },
    },
    async input => confirmarEntregaTool(input)
  )

  server.registerTool(
    'create_orden_compra',
    {
      title: 'Create purchase order',
      description: 'Create a distributor orden de compra.',
      inputSchema: {
        ...writeScopeFields,
        proveedor: z.string().min(1),
        producto: z.string().min(1),
        cantidad: z.number().positive(),
        costo: z.number().nonnegative().optional(),
      },
    },
    async input => createOrdenCompraTool(input)
  )

  server.registerTool(
    'confirmar_recepcion',
    {
      title: 'Confirm purchase receipt',
      description: 'Confirm distributor OC arrival and update stock.',
      inputSchema: {
        ...writeScopeFields,
        orden_id: z.string().uuid(),
        lineas: z.array(ocLineaSchema).min(1),
        proveedor: z.string().min(1),
        producto_resumen: z.string().min(1),
        total_recibido: z.number().nonnegative(),
      },
    },
    async input => confirmarRecepcionTool(input)
  )

  server.registerTool(
    'import_recepcion_draft',
    {
      title: 'Import recepción draft',
      description: 'Create or update a recepción draft from structured JSON (vision agent output).',
      inputSchema: {
        ...writeScopeFields,
        draft: z.record(z.unknown()),
      },
    },
    async input => importRecepcionDraftTool(input)
  )

  server.registerTool(
    'registrar_pago_cliente',
    {
      title: 'Register client payment',
      description: 'Register a payment against a cuentas por cobrar row.',
      inputSchema: {
        ...writeScopeFields,
        cuenta_id: z.string().uuid(),
        monto: z.number().positive(),
        cliente_nombre: z.string().min(1),
      },
    },
    async input => registrarPagoClienteTool(input)
  )

  server.registerTool(
    'editar_sku',
    {
      title: 'Edit SKU',
      description: 'Update distributor SKU category and/or price.',
      inputSchema: {
        ...writeScopeFields,
        sku_id: z.string().uuid(),
        nombre: z.string().min(1),
        categoria_liquido: z.enum(['mezcal', 'destilado', 'gin', 'vino', 'cerveza', 'otro']).optional(),
        precio_venta: z.number().nonnegative().optional(),
      },
    },
    async input => editarSkuTool(input)
  )

  server.registerTool(
    'get_cobro_context',
    {
      title: 'Collection message context',
      description:
        'Structured CxC data for an external agent to draft a collection message (no hosted LLM).',
      inputSchema: {
        ...writeScopeFields,
        cliente_nombre: z.string().min(1),
      },
    },
    async input => getCobroContextTool(input)
  )

  server.registerTool(
    'import_winemaker_ticket',
    {
      title: 'Import winemaker ticket',
      description: 'Create a winemaker document from structured ticket/CFDI extraction JSON.',
      inputSchema: {
        ...writeScopeFields,
        ticket: z.record(z.unknown()),
        winery_name: z.string().nullable().optional(),
      },
    },
    async input => importWinemakerTicketTool(input)
  )

  server.registerTool(
    'registrar_salida',
    {
      title: 'Register finished-goods exit',
      description:
        'Deduct bottles from a wm_existencias line. Set preview_only=true to validate conversion without writing. Enterprise orgs may pass rango_inicio/fin.',
      inputSchema: {
        ...writeScopeFields,
        existencia_id: z.string().uuid(),
        tipo: z.enum(['venta', 'degustacion', 'autoconsumo', 'merma', 'ajuste']),
        cantidad: z.number().positive(),
        unidad: z.enum(['botellas', 'cajas']),
        rango_inicio: z.number().int().positive().nullable().optional(),
        rango_fin: z.number().int().positive().nullable().optional(),
        preview_only: z.boolean().optional(),
      },
    },
    async input => registrarSalidaTool(input)
  )

  server.registerTool(
    'enviar_mensaje',
    {
      title: 'Send team chat message',
      description:
        'Post a message to the winemaker org chat as the authenticated user. Optional lote_id anchors the message to a lot thread. Requires Pro+ chat feature.',
      inputSchema: {
        ...writeScopeFields,
        body: z.string().min(1).max(4000),
        lote_id: z.string().uuid().nullable().optional(),
      },
    },
    async input => enviarMensajeTool(input)
  )

  server.registerTool(
    'crear_lote',
    {
      title: 'Create active lot',
      description:
        'Create a new active pipeline lot. Subject to plan lotes_activos limit — returns structured upgrade path when blocked.',
      inputSchema: {
        ...writeScopeFields,
        code: z.string().min(1),
        vintage_id: z.string().uuid().nullable().optional(),
        etapa: z.enum(LOT_ETAPA_VALUES as unknown as [string, ...string[]]).optional(),
        notes: z.string().nullable().optional(),
      },
    },
    async input => crearLoteTool(input)
  )

  server.registerTool(
    'registrar_embotellado',
    {
      title: 'Register bottling',
      description:
        'Close a lot and create finished-goods stock. New labels count toward etiquetas limit; event counts toward memoria.',
      inputSchema: {
        ...writeScopeFields,
        lot_id: z.string().uuid(),
        etiqueta_id: z.string().uuid().nullable().optional(),
        new_etiqueta: z
          .object({
            nombre: z.string().min(1),
            varietal: z.string().nullable().optional(),
            region: z.string().nullable().optional(),
            tipo: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
        anada: z.number().int().min(1900).max(2100),
        formato: z.string().min(1),
        botellas_por_caja: z
          .number()
          .refine((v): v is (typeof WM_BOTELLAS_POR_CAJA_VALUES)[number] =>
            (WM_BOTELLAS_POR_CAJA_VALUES as readonly number[]).includes(v)
          ),
        botellas_producidas: z.number().int().positive(),
        occurred_at: z.string().datetime().optional(),
      },
    },
    async input => registrarEmbotelladoTool(input)
  )

  server.registerTool(
    'cambiar_etapa_lote',
    {
      title: 'Change lot pipeline stage',
      description:
        'Append STAGE_CHANGED event and update lot etapa. Subject to memoria plan limit.',
      inputSchema: {
        ...writeScopeFields,
        lot_id: z.string().uuid(),
        to_etapa: z.enum(LOT_ETAPA_VALUES as unknown as [string, ...string[]]),
        note: z.string().nullable().optional(),
        occurred_at: z.string().datetime().optional(),
      },
    },
    async input => cambiarEtapaLoteTool(input)
  )
}
