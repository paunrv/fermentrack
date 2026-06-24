import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PREFIXES = ['/', '/sign-in', '/sign-up', '/auth/callback']

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/chat')) return true
  return PUBLIC_PREFIXES.some(
    prefix => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`))
  )
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
