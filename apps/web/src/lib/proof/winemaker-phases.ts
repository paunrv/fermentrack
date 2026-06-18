/**
 * Winemaker V2 — plan por fases (par de Destilador, no legacy productor).
 *
 * S0 Integración     Nav, guards, rutas /dashboard/winemaker/*
 * S1 Core datos      wm_documents, wm_wine_lots, wm_production_costs, wm_events + RLS
 * S2 Canvas + agente KPIs, contexto PROOF, quick answers, páginas stub
 * S3 Inventario      wm_inventory_items + wm_inventory_movements (ledger insumos)
 * S4 Tiempo/barricas wm_containers, wm_lot_transfers, aging events
 * S5 Laboratorio     wm_lab_analyses + documentos lab_result
 * S6 Margen          overhead allocation, costo/botella, reportes
 *
 * -----------------------------------------------------------------------------
 * Modelo de dominio (terminología producto)
 * -----------------------------------------------------------------------------
 *
 * Dos capas distintas — no confundir en UI, agente ni schema:
 *
 * 1. INSUMOS EN BODEGA
 *    Compras registradas vía ticket/factura (botellas, corchos, etiquetas, uva, etc.)
 *    que aún no están asignadas a un producto terminado.
 *    - Acción canvas: «Gasto de bodega» → wm_production_costs con allocation_method
 *      'overhead' y lot_id null.
 *    - Futuro (S3): saldo en wm_inventory_items + movimientos receive/consume.
 *
 * 2. LOTE (producto comercializable)
 *    Card final listo para guardar en bodega y comercializar — p. ej. «Merlot 2024 ·
 *    750 ml · 600 botellas». No es la factura del proveedor ni el proceso en barrica.
 *    - Nace en el evento de embotellado (bottling_completed), no al subir un ticket.
 *    - Estado objetivo en wm_wine_lots: bottled / comercializable (botellas disponibles,
 *      varietal, cosecha, formato).
 *    - Los cards de lote en PROOF representan inventario vendible, no fermentación activa.
 *
 * Flujo esperado:
 *
 *   Ticket/factura → insumo en bodega (overhead o inventario S3)
 *                         ↓
 *                 Embotellado (varietal, p. ej. Merlot)
 *                         ↓
 *         ¿Consumir todas las botellas de la compra o solo una fracción?
 *                         ↓
 *                 Lote comercializable (card final)
 *                         ↓
 *                 Venta / margen (S6)
 *
 * «Asignar a lote» (futuro, post-S3):
 *   - No es pegar una factura cruda a un lote existente.
 *   - Es imputar insumos (total o fracción) al embotellar un lote concreto.
 *   - El resto del insumo sigue en bodega con saldo disponible.
 *
 * Copy agente post-ticket:
 *   - «Queda en bodega» = insumo disponible (hoy: Gasto de bodega).
 *   - «Asignar a lote» = paso dentro del flujo de embotellado cuando exista lote destino.
 *
 * Proceso vs producto (wm_wine_lots hoy):
 *   - El schema incluye estados de proceso (fermentation, aging, ready, bottling) para
 *     S4 barricas y trazabilidad.
 *   - En canvas y KPIs, priorizar la lectura «lote = producto terminado»; el proceso
 *     intermedio vive en agenda/barricas hasta embotellar.
 */

export const WINEMAKER_PHASES = {
  S0_INTEGRACION: {
    id: 'S0',
    label: 'Integración',
    deliverables: [
      'WINEMAKER_PREFIXES + winemakerBlockedFromPath',
      'Nav winemaker (ocultar distribuidor y legacy)',
      'Rutas /dashboard/winemaker/*',
    ],
  },
  S1_CORE: {
    id: 'S1',
    label: 'Core datos',
    deliverables: [
      'wm_wine_lots',
      'wm_suppliers + wm_supply_kind',
      'wm_documents + wm_document_lines',
      'wm_production_costs',
      'wm_events (inmutable)',
      'proof.winemaker_row_owned + RLS',
    ],
  },
  S2_CANVAS: {
    id: 'S2',
    label: 'Canvas + agente',
    deliverables: [
      'lib/supabase/winemaker.ts',
      'winemaker-agent-context',
      'contexto route branch winemaker',
      'Canvas inicio + quick actions',
      'Ticket vision → documentos + cards CFDI',
      'Gasto de bodega (overhead sin lote)',
    ],
  },
  S3_INVENTARIO: {
    id: 'S3',
    label: 'Insumos a granel',
    deliverables: [
      'wm_inventory_items',
      'wm_inventory_movements',
      'receive vs consume immediate/stocked',
      'Saldo por insumo (botellas, corchos, etc.)',
      'Consumo fraccional al embotellar (p. ej. 600 de 1,000 botellas)',
    ],
  },
  S4_TIEMPO: {
    id: 'S4',
    label: 'Tiempo y barricas',
    deliverables: [
      'wm_containers',
      'wm_lot_transfers',
      'aging_started/ended events',
      'Proceso fermentación/barrica (distinto del lote comercializable)',
    ],
  },
  S5_LAB: {
    id: 'S5',
    label: 'Laboratorio',
    deliverables: ['wm_lab_analyses', 'lab_result documents', 'agente último análisis'],
  },
  S6_MARGEN: {
    id: 'S6',
    label: 'Margen y utilidad',
    deliverables: [
      'overhead allocation',
      'costo real/botella por lote comercializable',
      'Imputación de insumos (fracción usada) al costo del lote',
      'reportes',
    ],
  },
} as const

export type WinemakerPhaseId = (typeof WINEMAKER_PHASES)[keyof typeof WINEMAKER_PHASES]['id']
