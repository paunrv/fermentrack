import './globals.css'
import type { ReactNode } from 'react'
import { currentSession } from '@/lib/session'

export const metadata = {
  title: 'PROOF',
  description: 'Operational memory for wine producers',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await currentSession()

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
        />
      </head>
      <body>
        <div className="topbar">
          <div className="wrap">
            <a href="/" className="brand">PROOF</a>
            <a href="/" className="back">cellar</a>
            <a href="/tanks" className="back">tanks</a>
            <span className="spacer" />
            <span className="org">{session?.organizationName ?? 'no winery'}</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}
