import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const body = await req.json()
    const pin = body.pin

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    const userResult = await supabase
      .from('users')
      .select('pin_hash')
      .eq('id', user.id)
      .single()

    if (userResult.error || !userResult.data || !userResult.data.pin_hash) {
      return NextResponse.json({ error: 'No PIN set for this account' }, { status: 400 })
    }

    const pinHash = createHash('sha256').update(pin + user.id).digest('hex')
    const correct = pinHash === userResult.data.pin_hash

    return NextResponse.json({ correct: correct })
  } catch (err) {
    console.error('Verify PIN error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
