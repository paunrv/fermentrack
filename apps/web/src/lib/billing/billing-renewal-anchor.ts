/** Pre-vendimia billing anchor — Aug 1 (Northern hemisphere harvest season). */
export const VENDIMIA_RENEWAL_ANCHOR = { month: 8, day: 1 } as const

export const TRIAL_DURATION_DAYS = 90

export type RenewalAnchorParts = { month: number; day: number }

/** Next calendar occurrence of the renewal anchor on or after `from`. */
export function nextRenewalAnchorDate(
  from: Date,
  anchor: RenewalAnchorParts = VENDIMIA_RENEWAL_ANCHOR
): Date {
  const year = from.getFullYear()
  let candidate = new Date(Date.UTC(year, anchor.month - 1, anchor.day, 12, 0, 0))

  if (candidate.getTime() <= from.getTime()) {
    candidate = new Date(Date.UTC(year + 1, anchor.month - 1, anchor.day, 12, 0, 0))
  }

  return candidate
}

/** ISO date (YYYY-MM-DD) for organizations.renewal_anchor. */
export function formatRenewalAnchorDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Unix seconds for Stripe subscription billing_cycle_anchor. */
export function stripeBillingCycleAnchorUnix(anchorDate: Date): number {
  return Math.floor(anchorDate.getTime() / 1000)
}

export function computeTrialEndsAt(from: Date, days = TRIAL_DURATION_DAYS): Date {
  const end = new Date(from)
  end.setUTCDate(end.getUTCDate() + days)
  return end
}

export function isTrialExpired(trialEndsAt: string | null | undefined, now = new Date()): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt).getTime() <= now.getTime()
}

/** Days remaining in trial (0 if expired or no end date). */
export function trialDaysRemaining(trialEndsAt: string | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - now.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
