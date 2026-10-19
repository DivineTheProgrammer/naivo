import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { supabaseAdmin } from '../../../lib/supabase-admin'
import { hashPin } from '../../../lib/pin'
import { PIN_COOKIE_NAME, createPinCookieValue, pinCookieOptions } from '../../../lib/pin-cookie'

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const secret = process.env.PIN_COOKIE_SECRET
    if (!secret) {
      console.error('PIN_COOKIE_SECRET is not set')
      return NextResponse.json({ error: 'Server is not configured for PIN lock' }, { status: 500 })
    }

    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0

    if (Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
      return NextResponse.json({ error: 'For your security, sign in again with the email link before resetting your PIN.', needsFreshSignIn: true }, { status: 403 })
    }

    const body = await req.json()
    const pin = body.pin

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const updateResult = await supabaseAdmin
      .from('users')
      .update({ pin_hash: hashPin(pin), pin_failed_attempts: 0, pin_locked_until: null })
      .eq('id', user.id)

    if (updateResult.error) {
      return NextResponse.json({ error: 'Could not reset your PIN' }, { status: 500 })
    }

    const res = NextResponse.json({ message: 'PIN reset successfully' })
    res.cookies.set(PIN_COOKIE_NAME, await createPinCookieValue(user.id, secret), pinCookieOptions())
    return res
  } catch (err) {
    console.error('Reset PIN error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
