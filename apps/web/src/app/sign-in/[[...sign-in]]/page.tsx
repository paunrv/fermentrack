import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-display)',
      }}
    >
      <SignInForm />
    </main>
  )
}
