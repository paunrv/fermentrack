import { auth } from '@clerk/nextjs/server'

export async function getClerkUserId(): Promise<string | null> {
  // Evita reventar en build/entornos sin Clerk configurado.
  if (!process.env.CLERK_SECRET_KEY) return null
  try {
    const { userId } = await auth()
    return userId ?? null
  } catch {
    return null
  }
}

export async function requireClerkUserId(): Promise<string | null> {
  return await getClerkUserId()
}
