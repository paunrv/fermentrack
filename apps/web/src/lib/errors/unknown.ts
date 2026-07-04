/** Normalize thrown values (e.g. PostgrestError) for API responses. */
export function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'unknown_error'
}
