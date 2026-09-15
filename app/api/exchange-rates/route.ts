import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TARGET_CURRENCIES = ['USD', 'EUR', 'GBP']

export async function GET() {
  try {
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString()

    const cacheResult = await supabaseAdmin
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', 'NGN')
      .gte('fetched_at', oneHourAgo)
      .order('fetched_at', { ascending: false })

    if (cacheResult.data && cacheResult.data.length >= TARGET_CURRENCIES.length) {
      return NextResponse.json({ rates: cacheResult.data, source: 'cache' })
    }

    const fetchedRates = []

    for (const currency of TARGET_CURRENCIES) {
      const res = await fetch('https://www.currencyexchangetool.com/api/v1/convert?amount=1&from=NGN&to=' + currency)
      const data = await res.json()

      if (data.success && data.rate) {
        fetchedRates.push({
          base_currency: 'NGN',
          target_currency: currency,
          rate: data.rate,
        })
      }
    }

    if (fetchedRates.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch any rates' }, { status: 502 })
    }

    await supabaseAdmin.from('exchange_rates').insert(fetchedRates)

    return NextResponse.json({ rates: fetchedRates, source: 'live' })
  } catch (err) {
    console.error('Exchange rate fetch error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
