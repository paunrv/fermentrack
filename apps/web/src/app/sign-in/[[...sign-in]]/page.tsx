import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SignIn />
    </main>
  )
}
