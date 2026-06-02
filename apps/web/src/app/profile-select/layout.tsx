import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default function ProfileSelectLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.CLERK_SECRET_KEY) return children

  const { userId } = auth()
  if (!userId) redirect('/sign-in')
  return children
}
