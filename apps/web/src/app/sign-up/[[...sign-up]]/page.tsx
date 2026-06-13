import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
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
      <SignUp />
    </main>
  )
}
