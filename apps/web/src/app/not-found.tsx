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
        background: '#111',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>
        PROOF
      </p>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Página no encontrada</h1>
      <p style={{ margin: 0, fontSize: 14, color: '#999', maxWidth: 360, lineHeight: 1.5 }}>
        La ruta no existe o la sesión expiró. Vuelve al inicio o inicia sesión de nuevo.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <a
          href="/sign-in"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: '#fff',
            color: '#111',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Iniciar sesión
        </a>
        <a
          href="/dashboard"
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid #444',
            color: '#fff',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Dashboard
        </a>
      </div>
    </main>
  )
}
