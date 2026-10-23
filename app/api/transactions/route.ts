import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

const ALLOWED_CATEGORIES = ['salary', 'food', 'shopping', 'transport', 'bills', 'entertainment', 'other']

function parseFields(body: any) {
  const amount = Number(body.amount)
  const type = body.type
  const description = body.description ? String(body.description).slice(0, 200) : null
  const category = ALLOWED_CATEGORIES.indexOf(body.category) !== -1 ? body.category : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a number greater than zero' }
  }
  if (type !== 'credit' && type !== 'debit') {
    return { error: 'Type must be credit or debit' }
  }
  return { amount: amount, type: type, description: description, category: category }
}

function rpcErrorResponse(error: any) {
  if (error.code === 'P0001') {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (error.code === '22P02') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  console.error('Transaction RPC failed:', error)
  return NextResponse.json({ error: 'Could not complete that action' }, { status: 500 })
}

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

    if (!body.walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    const fields: any = parseFields(body)
    if (fields.error) {
      return NextResponse.json({ error: fields.error }, { status: 400 })
    }

    const rpcResult = await supabase.rpc('add_transaction', {
      p_wallet_id: body.walletId,
      p_amount: fields.amount,
      p_type: fields.type,
      p_description: fields.description,
      p_category: fields.category,
    })

    if (rpcResult.error) {
      return rpcErrorResponse(rpcResult.error)
    }

    return NextResponse.json({ transaction: rpcResult.data.transaction, newBalance: rpcResult.data.newBalance })
  } catch (err) {
    console.error('Create transaction error:', err)
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

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const fields: any = parseFields(body)
    if (fields.error) {
      return NextResponse.json({ error: fields.error }, { status: 400 })
    }

    const rpcResult = await supabase.rpc('update_transaction', {
      p_tx_id: body.id,
      p_amount: fields.amount,
      p_type: fields.type,
      p_description: fields.description,
      p_category: fields.category,
    })

    if (rpcResult.error) {
      return rpcErrorResponse(rpcResult.error)
    }

    return NextResponse.json({ transaction: rpcResult.data.transaction, newBalance: rpcResult.data.newBalance })
  } catch (err) {
    console.error('Update transaction error:', err)
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

    const rpcResult = await supabase.rpc('delete_transaction', { p_tx_id: id })

    if (rpcResult.error) {
      return rpcErrorResponse(rpcResult.error)
    }

    return NextResponse.json({ newBalance: rpcResult.data.newBalance })
  } catch (err) {
    console.error('Delete transaction error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
