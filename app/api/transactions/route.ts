import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

const ALLOWED_CATEGORIES = ['salary', 'food', 'shopping', 'transport', 'bills', 'entertainment', 'other']

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
      return NextResponse.json({ error: 'Could not load transactions' }, { status: 500 })
    }

    return NextResponse.json({ transactions: result.data })
  } catch (err) {
    console.error('Get transactions error:', err)
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
    const walletId = body.walletId
    const amount = Number(body.amount)
    const type = body.type
    const description = body.description ? String(body.description).slice(0, 200) : null
    const category = ALLOWED_CATEGORIES.indexOf(body.category) !== -1 ? body.category : null

    if (!walletId || !type) {
      return NextResponse.json({ error: 'walletId and type are required' }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a number greater than zero' }, { status: 400 })
    }

    if (type !== 'credit' && type !== 'debit') {
      return NextResponse.json({ error: 'Type must be credit or debit' }, { status: 400 })
    }

    const rpcResult = await supabase.rpc('add_transaction', {
      p_wallet_id: walletId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_category: category,
    })

    if (rpcResult.error) {
      if (rpcResult.error.code === 'P0001') {
        return NextResponse.json({ error: rpcResult.error.message }, { status: 400 })
      }
      if (rpcResult.error.code === '22P02') {
        return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
      }
      console.error('add_transaction failed:', rpcResult.error)
      return NextResponse.json({ error: 'Could not save the transaction' }, { status: 500 })
    }

    return NextResponse.json({ transaction: rpcResult.data.transaction, newBalance: rpcResult.data.newBalance })
  } catch (err) {
    console.error('Create transaction error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
