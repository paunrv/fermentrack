export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ink)',
        color: 'var(--fg-1)',
        fontFamily: 'var(--font-display)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          padding: 32,
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--line)',
            background:
              'linear-gradient(180deg, var(--panel-2), var(--panel))',
            color: 'var(--copper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          P
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 6,
              bottom: 6,
              width: 5,
              height: 5,
              background: 'var(--copper)',
            }}
          />
        </div>

        <div className="eyebrow" style={{ color: 'var(--copper)' }}>
          Operational intelligence · Liquid operations
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '0.08em',
            lineHeight: 1,
            color: 'var(--fg-0)',
          }}
        >
          PROOF
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--fg-2)',
            maxWidth: 420,
          }}
        >
          The operating system for wineries, breweries, distilleries
          and distributors. Every bottle tells a story.
          <br />
          <span style={{ color: 'var(--copper)' }}>We track the proof.</span>
        </p>

        <a
          href="/sign-in"
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 18px',
            background: 'var(--copper)',
            border: '1px solid var(--copper)',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Enter cockpit
          <span style={{ fontSize: 13, lineHeight: 0 }}>↗</span>
        </a>

        <div
          className="mono"
          style={{
            marginTop: 4,
            fontSize: 10,
            color: 'var(--fg-4)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          v2.4 · system nominal
        </div>
      </div>
    </main>
  );
}
