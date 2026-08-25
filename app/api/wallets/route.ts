import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const result = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ wallets: result.data })
  } catch (err) {
    console.error('Get wallets error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const body = await req.json()
    const name = body.name
    const provider = body.provider || null
    const currency = body.currency || 'NGN'

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const insertResult = await supabase
      .from('wallets')
      .insert({
        user_id: user.id,
        name: name,
        provider: provider,
        currency: currency,
        source_type: 'manual',
        balance: 0,
      })
      .select()
      .single()

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ wallet: insertResult.data })
  } catch (err) {
    console.error('Create wallet error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
