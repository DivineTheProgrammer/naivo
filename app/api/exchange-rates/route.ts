import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TARGET_CURRENCIES = ['USD', 'EUR', 'GBP']

function latestPerCurrency(rows: any[]) {
  const seen: any = {}
  const out: any[] = []
  for (const row of rows) {
    if (!seen[row.target_currency]) {
      seen[row.target_currency] = true
      out.push(row)
    }
  }
  return out
}

export async function GET() {
  try {
    const cacheResult = await supabaseAdmin
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', 'NGN')
      .order('fetched_at', { ascending: false })
      .limit(30)

    const latest = latestPerCurrency(cacheResult.data || [])
    const oneHourAgo = Date.now() - 1000 * 60 * 60

    const allFresh = latest.length >= TARGET_CURRENCIES.length && latest.every(function (r) {
      return new Date(r.fetched_at).getTime() > oneHourAgo
    })

    if (allFresh) {
      return NextResponse.json({ rates: latest, source: 'cache', stale: false })
    }

    const fetchedRates: any[] = []

    for (const currency of TARGET_CURRENCIES) {
      try {
        const res = await fetch('https://www.currencyexchangetool.com/api/v1/convert?amount=1&from=NGN&to=' + currency)
        if (!res.ok) continue
        const data = await res.json()
        if (data.success && data.rate) {
          fetchedRates.push({ base_currency: 'NGN', target_currency: currency, rate: data.rate })
        }
      } catch (fetchErr) {
        console.error('Rate fetch failed for ' + currency + ':', fetchErr)
      }
    }

    if (fetchedRates.length > 0) {
      await supabaseAdmin.from('exchange_rates').insert(fetchedRates)
    }

    const fetchedCurrencies = fetchedRates.map(function (r) { return r.target_currency })
    const staleFallback = latest.filter(function (r) { return fetchedCurrencies.indexOf(r.target_currency) === -1 })
    const merged = fetchedRates.concat(staleFallback)

    if (merged.length === 0) {
      return NextResponse.json({ rates: [], source: 'unavailable', stale: true })
    }

    return NextResponse.json({ rates: merged, source: fetchedRates.length > 0 ? 'live' : 'stale-cache', stale: staleFallback.length > 0 })
  } catch (err) {
    console.error('Exchange rate route error:', err)
    return NextResponse.json({ rates: [], source: 'unavailable', stale: true })
  }
}
