/** Maps Supabase Auth error messages to next-intl keys under auth.errors */
export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'userAlreadyRegistered'
  | 'weakPassword'
  | 'generic'

export function translateAuthError(
  message: string,
  t: (key: AuthErrorKey) => string
): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return t('invalidCredentials')
  }
  if (m.includes('email not confirmed')) {
    return t('emailNotConfirmed')
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return t('userAlreadyRegistered')
  }
  if (m.includes('password') && (m.includes('6') || m.includes('least'))) {
    return t('weakPassword')
  }

  return message.trim() || t('generic')
}
