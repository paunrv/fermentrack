export const WINEMAKER_DASHBOARD_TOUR_VERSION = 'v1'

export function winemakerDashboardTourStorageKey(userId: string): string {
  return `proof_winemaker_dashboard_tour_${WINEMAKER_DASHBOARD_TOUR_VERSION}_${userId}`
}

export function readWinemakerDashboardTourCompleted(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(winemakerDashboardTourStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function writeWinemakerDashboardTourCompleted(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(winemakerDashboardTourStorageKey(userId), '1')
  } catch {
    /* ignore */
  }
}
