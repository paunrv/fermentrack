import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <SignIn />
    </main>
  )
}
