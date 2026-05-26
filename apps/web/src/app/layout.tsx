import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ProfileProvider } from '@/context/ProfileContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fermentrack',
  description: 'Production operating system for alcohol manufacturers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ClerkProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}