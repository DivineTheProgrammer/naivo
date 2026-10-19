import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { supabaseAdmin } from '../../../lib/supabase-admin'
import { hashPin, verifyPinHash } from '../../../lib/pin'
import { PIN_COOKIE_NAME, createPinCookieValue, pinCookieOptions } from '../../../lib/pin-cookie'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

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

    const rowResult = await supabaseAdmin.from('users').select('pin_hash').eq('id', user.id).single()

    if (rowResult.error || !rowResult.data || !rowResult.data.pin_hash) {
      return NextResponse.json({ error: 'No PIN set for this account' }, { status: 400 })
    }

    const claim = await supabaseAdmin.rpc('claim_pin_attempt', { p_user_id: user.id, p_max: MAX_ATTEMPTS, p_lock_minutes: LOCK_MINUTES })

    if (claim.error || !claim.data) {
      console.error('claim_pin_attempt failed:', claim.error)
      return NextResponse.json({ error: 'Could not check your PIN' }, { status: 500 })
    }

    if (claim.data.reason === 'no_user') {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!claim.data.allowed) {
      return NextResponse.json({ correct: false, locked: true, retryAfterSeconds: claim.data.retryAfterSeconds || LOCK_MINUTES * 60 }, { status: 429 })
    }

    const check = verifyPinHash(pin, rowResult.data.pin_hash, user.id)

    if (!check.ok) {
      if (claim.data.lockedNow) {
        return NextResponse.json({ correct: false, locked: true, retryAfterSeconds: claim.data.retryAfterSeconds }, { status: 429 })
      }
      return NextResponse.json({ correct: false, attemptsLeft: claim.data.attemptsLeft }, { status: 401 })
    }

    const update: any = { pin_failed_attempts: 0, pin_locked_until: null }
    if (check.needsUpgrade) update.pin_hash = hashPin(pin)
    await supabaseAdmin.from('users').update(update).eq('id', user.id)

    const res = NextResponse.json({ correct: true })
    res.cookies.set(PIN_COOKIE_NAME, await createPinCookieValue(user.id, secret), pinCookieOptions())
    return res
  } catch (err) {
    console.error('Verify PIN error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
