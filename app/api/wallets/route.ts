import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

const ALLOWED_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP']
const MAX_WALLETS = 20

function cleanName(value: any) {
  return String(value || '').trim().slice(0, 40)
}

export async function GET() {
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
      return NextResponse.json({ error: 'Could not load wallets' }, { status: 500 })
    }

    return NextResponse.json({ wallets: result.data })
  } catch (err) {
    console.error('Get wallets error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
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
    const name = cleanName(body.name)
    const provider = body.provider ? cleanName(body.provider) : null
    const currency = ALLOWED_CURRENCIES.indexOf(body.currency) !== -1 ? body.currency : 'NGN'

    if (!name) {
      return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 })
    }

    const countResult = await supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

    if (countResult.count !== null && countResult.count >= MAX_WALLETS) {
      return NextResponse.json({ error: 'You can have up to ' + MAX_WALLETS + ' wallets.' }, { status: 400 })
    }

    const insertResult = await supabase
      .from('wallets')
      .insert({ user_id: user.id, name: name, provider: provider, currency: currency, source_type: 'manual', balance: 0 })
      .select()
      .single()

    if (insertResult.error) {
      return NextResponse.json({ error: 'Could not create the wallet' }, { status: 500 })
    }

    return NextResponse.json({ wallet: insertResult.data })
  } catch (err) {
    console.error('Create wallet error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const body = await req.json()
    const name = cleanName(body.name)
    const provider = body.provider ? cleanName(body.provider) : null

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 })
    }

    const updateResult = await supabase
      .from('wallets')
      .update({ name: name, provider: provider })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateResult.error || !updateResult.data) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    return NextResponse.json({ wallet: updateResult.data })
  } catch (err) {
    console.error('Rename wallet error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const rpcResult = await supabase.rpc('delete_wallet', { p_wallet_id: id })

    if (rpcResult.error) {
      if (rpcResult.error.code === 'P0001') {
        return NextResponse.json({ error: rpcResult.error.message }, { status: 404 })
      }
      if (rpcResult.error.code === '22P02') {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
      }
      console.error('delete_wallet failed:', rpcResult.error)
      return NextResponse.json({ error: 'Could not delete the wallet' }, { status: 500 })
    }

    return NextResponse.json({ deletedTransactions: rpcResult.data.deletedTransactions })
  } catch (err) {
    console.error('Delete wallet error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
