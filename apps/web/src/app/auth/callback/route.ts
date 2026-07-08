import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { resolvePostAuthPath } from '@/lib/auth/auth-callback'
import { clearAuthNextCookieHeader } from '@/lib/auth/post-auth-next'
import { resolveSiteUrl } from '@/lib/i18n/site'

function requireSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function requireAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

function safeNext(
  next: string | null,
  flow: string | null,
  intent: string | null,
  cookieHeader: string | null
): string {
  return resolvePostAuthPath(next, flow, intent, cookieHeader)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteOrigin = resolveSiteUrl(request)
  const code = searchParams.get('code')
  const next = safeNext(
    searchParams.get('next'),
    searchParams.get('flow'),
    searchParams.get('intent'),
    request.headers.get('cookie')
  )
  const clearNextCookie = clearAuthNextCookieHeader()

  if (!code) {
    const flow = searchParams.get('flow')
    const intent = searchParams.get('intent')
    if (flow === 'team' || intent) {
      // Preserve hash tokens when Supabase uses implicit grant on /auth/callback.
      const bridge = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>PROOF</title><script>
(function(){
  var q = new URLSearchParams(window.location.search);
  var dest = new URL('/auth/confirm', window.location.origin);
  q.forEach(function(v,k){ dest.searchParams.set(k,v); });
  dest.hash = window.location.hash;
  window.location.replace(dest.toString());
})();
</script></head><body></body></html>`
      return new NextResponse(bridge, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const redirect = NextResponse.redirect(`${siteOrigin}/sign-in?error=auth`)
    redirect.cookies.set(clearNextCookie.name, clearNextCookie.value, clearNextCookie.options)
    return redirect
  }

  const flow = searchParams.get('flow')
  const redirect = NextResponse.redirect(`${siteOrigin}${next}`)
  redirect.cookies.set(clearNextCookie.name, clearNextCookie.value, clearNextCookie.options)
  const supabase = createServerClient(requireSupabaseUrl(), requireAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          redirect.cookies.set(name, value, options)
        )
      },
    },
  })

  if (flow === 'team') {
    await supabase.auth.signOut()
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    const failureRedirect = NextResponse.redirect(`${siteOrigin}/sign-in?error=auth`)
    failureRedirect.cookies.set(clearNextCookie.name, clearNextCookie.value, clearNextCookie.options)
    return failureRedirect
  }

  return redirect
}
