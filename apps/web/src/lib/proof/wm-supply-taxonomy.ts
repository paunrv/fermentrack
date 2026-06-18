/** Taxonomía de insumos winemaker — PROOF clasifica tickets en estos tipos. */

export type WmSupplyKind =
  | 'uva'
  | 'corcho'
  | 'botella'
  | 'etiqueta'
  | 'caja'
  | 'tapa'
  | 'sulfito'
  | 'levadura'
  | 'clarificante'
  | 'barrica'
  | 'energia'
  | 'mano_obra'
  | 'analisis'
  | 'flete'
  | 'equipo'
  | 'limpieza'
  | 'otro'

export const WM_SUPPLY_KIND_LABEL: Record<WmSupplyKind, string> = {
  uva: 'Uva',
  corcho: 'Corcho',
  botella: 'Botella',
  etiqueta: 'Etiqueta',
  caja: 'Caja',
  tapa: 'Tapa / cápsula',
  sulfito: 'Sulfito / químico',
  levadura: 'Levadura',
  clarificante: 'Clarificante',
  barrica: 'Barrica',
  energia: 'Energía',
  mano_obra: 'Mano de obra',
  analisis: 'Análisis de laboratorio',
  flete: 'Flete / transporte',
  equipo: 'Equipo',
  limpieza: 'Limpieza',
  otro: 'Otro',
}

/** Sinónimos → supply_kind (normalizado sin acentos, minúsculas). */
const SUPPLY_ALIASES: [string, WmSupplyKind][] = [
  ['uva', 'uva'],
  ['uvas', 'uva'],
  ['grape', 'uva'],
  ['grapes', 'uva'],
  ['cabernet', 'uva'],
  ['merlot', 'uva'],
  ['tempranillo', 'uva'],
  ['nebbiolo', 'uva'],
  ['chardonnay', 'uva'],
  ['malbec', 'uva'],
  ['pinot', 'uva'],
  ['syrah', 'uva'],
  ['garnacha', 'uva'],
  ['mosto', 'uva'],
  ['corcho', 'corcho'],
  ['corchos', 'corcho'],
  ['tapón', 'corcho'],
  ['tapon', 'corcho'],
  ['cork', 'corcho'],
  ['botella', 'botella'],
  ['botellas', 'botella'],
  ['bottle', 'botella'],
  ['vidrio', 'botella'],
  ['etiqueta', 'etiqueta'],
  ['etiquetas', 'etiqueta'],
  ['label', 'etiqueta'],
  ['contraetiqueta', 'etiqueta'],
  ['collarin', 'etiqueta'],
  ['caja', 'caja'],
  ['cajas', 'caja'],
  ['cartón', 'caja'],
  ['carton', 'caja'],
  ['tapa', 'tapa'],
  ['capsula', 'tapa'],
  ['cápsula', 'tapa'],
  ['sulfito', 'sulfito'],
  ['so2', 'sulfito'],
  ['metabisulfito', 'sulfito'],
  ['levadura', 'levadura'],
  ['yeast', 'levadura'],
  ['clarificante', 'clarificante'],
  ['bentonita', 'clarificante'],
  ['barrica', 'barrica'],
  ['barricas', 'barrica'],
  ['roble', 'barrica'],
  ['energia', 'energia'],
  ['electricidad', 'energia'],
  ['luz', 'energia'],
  ['mano de obra', 'mano_obra'],
  ['mano_obra', 'mano_obra'],
  ['nomina', 'mano_obra'],
  ['laboratorio', 'analisis'],
  ['analisis', 'analisis'],
  ['análisis', 'analisis'],
  ['lab', 'analisis'],
  ['flete', 'flete'],
  ['transporte', 'flete'],
  ['equipo', 'equipo'],
  ['limpieza', 'limpieza'],
]

const KNOWN_VARIETALS = [
  'cabernet sauvignon',
  'cabernet',
  'merlot',
  'tempranillo',
  'nebbiolo',
  'chardonnay',
  'malbec',
  'pinot noir',
  'pinot',
  'syrah',
  'garnacha',
  'sauvignon blanc',
  'chenin blanc',
  'viognier',
  'sangiovese',
  'tempranillo',
  'carignan',
  'mourvedre',
  'grenache',
]

export function normalizeSupplyText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeSupplierName(name: string): string {
  return normalizeSupplyText(name).replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function inferSupplyKind(text: string): WmSupplyKind {
  const q = normalizeSupplyText(text)
  if (!q) return 'otro'

  for (const [alias, kind] of SUPPLY_ALIASES) {
    if (q.includes(alias)) return kind
  }

  return 'otro'
}

export function inferVarietal(text: string): string {
  const q = normalizeSupplyText(text)
  for (const v of KNOWN_VARIETALS) {
    if (q.includes(v)) {
      return v
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
  }
  return ''
}

export function supplyKindToCostCategory(kind: WmSupplyKind): string {
  switch (kind) {
    case 'uva':
      return 'uva'
    case 'mano_obra':
      return 'mano_obra'
    case 'energia':
      return 'energia'
    case 'analisis':
      return 'analisis'
    case 'barrica':
      return 'barrica'
    case 'flete':
      return 'flete'
    case 'equipo':
      return 'equipo'
    case 'limpieza':
      return 'limpieza'
    case 'corcho':
    case 'botella':
    case 'etiqueta':
    case 'caja':
    case 'tapa':
    case 'sulfito':
    case 'levadura':
    case 'clarificante':
      return 'insumo'
    default:
      return 'otro'
  }
}

export function formatSupplyLineLabel(kind: WmSupplyKind, varietal?: string): string {
  const base = WM_SUPPLY_KIND_LABEL[kind]
  if (kind === 'uva' && varietal?.trim()) {
    return `${base} · ${varietal.trim()}`
  }
  return base
}
