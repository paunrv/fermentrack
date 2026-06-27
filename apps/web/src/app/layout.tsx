import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'PROOF · Operational Intelligence for Liquid Operations',
  description:
    'The operating system for wineries, breweries, distilleries and distributors. Every bottle tells a story. We track the proof.',
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
