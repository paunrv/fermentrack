export const dynamic = 'force-dynamic'

/** Sin ClerkProvider: evita 404 en cadena cuando middleware no corre (assets, etc.). */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
        background: 'var(--ink)',
        color: 'var(--fg-0)',
        fontFamily: 'var(--font-display)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
        }}
      >
        PROOF
      </p>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Página no encontrada</h1>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-2)',
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        La ruta no existe o la sesión expiró. Vuelve al inicio o inicia sesión de nuevo.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <a
          href="/sign-in"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--fg-0)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Iniciar sesión
        </a>
        <a
          href="/dashboard"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--hairline)',
            color: 'var(--fg-0)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Dashboard
        </a>
      </div>
    </main>
  )
}
