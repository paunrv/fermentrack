/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        canvas: 'var(--canvas)',
        panel: 'var(--panel)',
        hairline: 'var(--hairline)',
        'page-bg': 'var(--page-bg)',
        'surface-card': 'var(--surface-card)',
        'surface-muted': 'var(--surface-muted)',
        fg: {
          0: 'var(--fg-0)',
          1: 'var(--fg-1)',
          2: 'var(--fg-2)',
          3: 'var(--fg-3)',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        crit: 'var(--crit)',
        info: 'var(--info)',
        accent: 'var(--proof-accent)',
        'accent-soft': 'var(--accent-soft)',
        'nav-active': 'var(--nav-active-bg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        card: 'var(--radius-card)',
        page: 'var(--radius-page)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
    },
  },
}
