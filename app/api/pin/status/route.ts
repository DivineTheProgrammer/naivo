import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { supabaseAdmin } from '../../../lib/supabase-admin'

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const row = await supabaseAdmin.from('users').select('pin_hash, pin_locked_until').eq('id', user.id).single()

    if (row.error || !row.data) {
      return NextResponse.json({ error: 'Could not load your account' }, { status: 500 })
    }

    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0
    const lockedUntil = row.data.pin_locked_until ? new Date(row.data.pin_locked_until).getTime() : 0

    return NextResponse.json({
      hasPin: Boolean(row.data.pin_hash),
      recentSignIn: Date.now() - lastSignIn < RECENT_SIGN_IN_MS,
      lockedForSeconds: lockedUntil > Date.now() ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0,
    })
  } catch (err) {
    console.error('PIN status error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
