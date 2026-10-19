import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'
import { supabaseAdmin } from '../../lib/supabase-admin'
import { hashPin } from '../../lib/pin'
import { PIN_COOKIE_NAME, createPinCookieValue, pinCookieOptions } from '../../lib/pin-cookie'

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

    const body = await req.json()
    const pin = body.pin

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const existing = await supabaseAdmin.from('users').select('pin_hash').eq('id', user.id).single()

    if (existing.error || !existing.data) {
      return NextResponse.json({ error: 'Could not load your account' }, { status: 500 })
    }

    if (existing.data.pin_hash) {
      return NextResponse.json({ error: 'A PIN is already set. Use Forgot PIN to reset it.' }, { status: 409 })
    }

    const updateResult = await supabaseAdmin
      .from('users')
      .update({ pin_hash: hashPin(pin), pin_failed_attempts: 0, pin_locked_until: null })
      .eq('id', user.id)

    if (updateResult.error) {
      return NextResponse.json({ error: 'Could not save your PIN' }, { status: 500 })
    }

    const res = NextResponse.json({ message: 'PIN set successfully' })
    res.cookies.set(PIN_COOKIE_NAME, await createPinCookieValue(user.id, secret), pinCookieOptions())
    return res
  } catch (err) {
    console.error('Set PIN error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
