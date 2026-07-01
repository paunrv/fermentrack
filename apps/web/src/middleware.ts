import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware(routing)

const PUBLIC_PREFIXES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/i18n-pilot',
  '/contacto',
  '/nosotros',
  '/terminos',
  '/privacidad',
]

/** Public routes — no auth redirect. Protected: /dashboard/*, /onboarding */
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/chat')) return true
  if (pathname.startsWith('/api/billing/webhook')) return true
  if (pathname.startsWith('/api/contact')) return true
  return PUBLIC_PREFIXES.some(
    prefix => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`))
  )
}

function mergeCookies(from: NextResponse, into: NextResponse): NextResponse {
  from.cookies.getAll().forEach(cookie => {
    into.cookies.set(cookie.name, cookie.value)
  })
  return into
}

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request)
  const { supabaseResponse, user } = await updateSession(request)

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return mergeCookies(supabaseResponse, intlResponse)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
