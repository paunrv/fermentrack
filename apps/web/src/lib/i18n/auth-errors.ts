/** Maps Supabase Auth error messages to next-intl keys under auth.errors */
export function translateAuthError(
  message: string,
  t: (key: 'invalidCredentials' | 'emailNotConfirmed' | 'generic') => string
): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return t('invalidCredentials')
  }
  if (m.includes('email not confirmed')) {
    return t('emailNotConfirmed')
  }

  return message.trim() || t('generic')
}
