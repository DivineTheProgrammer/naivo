import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'
import { supabaseAdmin } from '../../lib/supabase-admin'
import { PIN_COOKIE_NAME, pinCookieOptions } from '../../lib/pin-cookie'

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0

    if (Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
      return NextResponse.json({ error: 'For your security, sign out and sign in again with the email link, then try again within 10 minutes.', needsFreshSignIn: true }, { status: 403 })
    }

    const body = await req.json()
    const typed = String(body.email || '').trim().toLowerCase()

    if (!user.email || typed !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'The email you typed does not match this account.' }, { status: 400 })
    }

    const result = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (result.error) {
      console.error('Delete account failed:', result.error)
      return NextResponse.json({ error: 'Could not delete your account. Nothing was changed.' }, { status: 500 })
    }

    const res = NextResponse.json({ message: 'Account deleted' })
    res.cookies.set(PIN_COOKIE_NAME, '', { ...pinCookieOptions(), maxAge: 0 })
    return res
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
