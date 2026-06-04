/** Supabase/Postgrest devuelve `{ message, code, details }` sin ser instanceof Error. */
export function proofErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as { message: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return 'Error de contexto'
}

export function throwIfSupabaseError(
  error: { message: string } | null | undefined,
  context?: string
): void {
  if (!error) return
  const prefix = context ? `${context}: ` : ''
  throw new Error(`${prefix}${error.message}`)
}
