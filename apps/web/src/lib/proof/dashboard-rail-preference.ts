export const DASHBOARD_RAIL_EXPANDED_STORAGE_KEY = 'proof_dashboard_rail_expanded'

export function readDashboardRailExpanded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DASHBOARD_RAIL_EXPANDED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeDashboardRailExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DASHBOARD_RAIL_EXPANDED_STORAGE_KEY, expanded ? '1' : '0')
  } catch {
    /* ignore */
  }
}
