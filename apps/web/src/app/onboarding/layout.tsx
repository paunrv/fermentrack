import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Vercel build puede correr sin envs. Si falta Clerk secret, evitamos ejecutar auth()
  // para no romper "collect page data". En runtime, con env configurada, sí protegemos.
  if (!process.env.CLERK_SECRET_KEY) return children

  const { userId } = auth()
  if (!userId) redirect('/sign-in')
  return children
}
