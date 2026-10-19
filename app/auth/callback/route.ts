import { createServerSupabaseClient } from '../../lib/supabase-server'
import { PIN_COOKIE_NAME, pinCookieOptions } from '../../lib/pin-cookie'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  const res = NextResponse.redirect(origin + '/dashboard')
  res.cookies.set(PIN_COOKIE_NAME, '', { ...pinCookieOptions(), maxAge: 0 })
  return res
}
