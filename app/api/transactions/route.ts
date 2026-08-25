import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const walletId = req.nextUrl.searchParams.get('walletId')

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_time', { ascending: false })

    if (walletId) {
      query = query.eq('wallet_id', walletId)
    }

    const result = await query

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ transactions: result.data })
  } catch (err) {
    console.error('Get transactions error:', err)
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
    const walletId = body.walletId
    const amount = body.amount
    const type = body.type
    const description = body.description || null
    const category = body.category || null

    if (!walletId || amount === undefined || !type) {
      return NextResponse.json({ error: 'walletId, amount, and type are required' }, { status: 400 })
    }

    if (type !== 'credit' && type !== 'debit') {
      return NextResponse.json({ error: 'type must be credit or debit' }, { status: 400 })
    }

    const walletResult = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single()

    if (walletResult.error || !walletResult.data) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = walletResult.data
    const lockedUntil = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

    const insertResult = await supabase
      .from('transactions')
      .insert({
        wallet_id: walletId,
        user_id: user.id,
        amount: amount,
        type: type,
        description: description,
        category: category,
        source_type: 'manual',
        transaction_time: new Date().toISOString(),
        locked_until: lockedUntil,
      })
      .select()
      .single()

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }

    const newBalance = type === 'credit' ? wallet.balance + amount : wallet.balance - amount

    const updateResult = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', walletId)

    if (updateResult.error) {
      console.error('Failed to update wallet balance:', updateResult.error)
    }

    return NextResponse.json({ transaction: insertResult.data, newBalance: newBalance })
  } catch (err) {
    console.error('Create transaction error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
