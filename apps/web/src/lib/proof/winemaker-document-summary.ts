import { formatSupplyLineLabel } from '@/lib/proof/wm-supply-taxonomy'
import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'

export function lineSummaryFromDocumentLines(
  lines: { supply_kind: string; varietal: string }[]
): string {
  if (lines.length === 0) return ''
  return lines
    .slice(0, 3)
    .map(l => formatSupplyLineLabel(l.supply_kind as WmSupplyKind, l.varietal))
    .join(', ')
}
