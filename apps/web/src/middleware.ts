import { authMiddleware } from '@clerk/nextjs/server'

export default authMiddleware({
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/api/chat', '/onboarding', '/profile-select'],
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
