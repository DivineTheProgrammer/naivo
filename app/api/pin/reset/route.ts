import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { createHash } from 'crypto'

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
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

    const pinHash = createHash('sha256').update(pin + user.id).digest('hex')

    const updateResult = await supabase.from('users').update({ pin_hash: pinHash }).eq('id', user.id)

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'PIN reset successfully' })
  } catch (err) {
    console.error('Reset PIN error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
