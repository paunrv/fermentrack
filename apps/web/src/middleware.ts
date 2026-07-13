import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
} from '@/lib/i18n/request-locale'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PREFIXES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/auth/confirm',
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
  if (pathname.startsWith('/api/mcp')) return true
  if (pathname.startsWith('/.well-known/')) return true
  return PUBLIC_PREFIXES.some(
    prefix => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`))
  )
}

function mergeCookies(from: NextResponse, into: NextResponse): NextResponse {
  from.cookies.getAll().forEach(cookie => {
    into.cookies.set(cookie)
  })
  return into
}

/** Set NEXT_LOCALE on first visit; no path rewrites (app has no `[locale]` segment). */
function ensureLocaleCookie(request: NextRequest, response: NextResponse): void {
  if (request.cookies.get(LOCALE_COOKIE)?.value) return

  const locale = localeFromAcceptLanguage(request.headers.get('accept-language'))
  const cookieConfig = routing.localeCookie
  const maxAge =
    typeof cookieConfig === 'object' && cookieConfig && 'maxAge' in cookieConfig
      ? cookieConfig.maxAge
      : 60 * 60 * 24 * 365

  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: maxAge ?? 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname, search } = request.nextUrl

  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    mergeCookies(supabaseResponse, redirect)
    ensureLocaleCookie(request, redirect)
    return redirect
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', `${pathname}${search}`)
    const redirect = NextResponse.redirect(url)
    mergeCookies(supabaseResponse, redirect)
    ensureLocaleCookie(request, redirect)
    return redirect
  }

  ensureLocaleCookie(request, supabaseResponse)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
