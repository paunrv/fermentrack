export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Auth se aplica vía `apps/web/src/middleware.ts` (Clerk authMiddleware).
  // Evitamos `auth()` aquí para no romper `next build` al colectar page data.
  return children
}
