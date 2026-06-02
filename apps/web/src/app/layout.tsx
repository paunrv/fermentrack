import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ProfileProvider } from '@/context/ProfileContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'PROOF · Operational Intelligence for Liquid Operations',
  description:
    'The operating system for wineries, breweries, distilleries and distributors. Every bottle tells a story. We track the proof.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {clerkPublishableKey ? (
          <ClerkProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </ClerkProvider>
        ) : (
          <ProfileProvider>{children}</ProfileProvider>
        )}
      </body>
    </html>
  );
}
