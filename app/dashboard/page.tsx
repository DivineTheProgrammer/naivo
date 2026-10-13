'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Nav from '../components/Nav'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [wallets, setWallets] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [homeCurrency, setHomeCurrency] = useState('NGN')
  const [rates, setRates] = useState<any[]>([])
  const [ratesStale, setRatesStale] = useState(false)

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      const currentUser = result.data.user
      if (!currentUser) {
        router.push('/login')
        return
      }

      const profileResult = await supabase.from('users').select('onboarding_completed, home_currency').eq('id', currentUser.id).single()

      if (profileResult.data && profileResult.data.onboarding_completed === false) {
        router.push('/onboarding')
        return
      }

      if (profileResult.data && profileResult.data.home_currency) setHomeCurrency(profileResult.data.home_currency)

      const walletsRes = await fetch('/api/wallets')
      const walletsData = await walletsRes.json()
      setWallets(walletsData.wallets || [])

      if (walletsData.wallets && walletsData.wallets.length > 0) {
        const txRes = await fetch('/api/transactions?walletId=' + walletsData.wallets[0].id)
        const txData = await txRes.json()
        setRecentTransactions((txData.transactions || []).slice(0, 5))
      }

      try {
        const ratesRes = await fetch('/api/exchange-rates')
        const ratesData = await ratesRes.json()
        setRates(ratesData.rates || [])
        setRatesStale(ratesData.stale === true)
      } catch (ratesErr) {
        setRates([])
      }

      setCheckingAuth(false)
    })
  }, [])

  const currencySymbol: any = { NGN: '\u20A6', USD: '$', EUR: '\u20AC', GBP: '\u00A3' }

  const formatMoney = function (amount: number, currency: string) {
    const sign = amount < 0 ? '-' : ''
    const symbol = currencySymbol[currency] || ''
    return sign + symbol + Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const hasRate = function (currency: string) {
    return currency === 'NGN' || rates.some(function (r) { return r.target_currency === currency })
  }

  const canConvert = function (fromCurrency: string) {
    if (fromCurrency === homeCurrency) return true
    return hasRate(fromCurrency) && hasRate(homeCurrency)
  }

  const convertToHome = function (amount: number, fromCurrency: string) {
    if (fromCurrency === homeCurrency) return amount
    if (fromCurrency === 'NGN') {
      const rate = rates.find(function (r) { return r.target_currency === homeCurrency })
      return rate ? amount * rate.rate : amount
    }
    const rateFromHome = rates.find(function (r) { return r.target_currency === fromCurrency })
    if (rateFromHome) {
      const inNgn = amount / rateFromHome.rate
      if (homeCurrency === 'NGN') return inNgn
      const rateToHome = rates.find(function (r) { return r.target_currency === homeCurrency })
      return rateToHome ? inNgn * rateToHome.rate : inNgn
    }
    return amount
  }

  const ratesMissing = wallets.some(function (w) { return !canConvert(w.currency) })
  const totalInHomeCurrency = wallets.reduce(function (sum, w) { return sum + convertToHome(Number(w.balance), w.currency) }, 0)
  const totalIsNegative = totalInHomeCurrency < 0

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32 md:pb-20">
        <section className="text-center">
          <p className="text-zinc-400 text-sm font-medium">Total balance</p>
          {ratesMissing ? (
            <div>
              <p className="text-amber-400 text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Rates unavailable</p>
              <p className="text-zinc-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">Some wallets use another currency and live exchange rates could not be loaded. Try again shortly.</p>
            </div>
          ) : (
            <div>
              <p className={'text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight tabular-nums break-words ' + (totalIsNegative ? 'text-rose-400' : 'text-white')}>
                {formatMoney(totalInHomeCurrency, homeCurrency)}
              </p>
              <p className="text-zinc-400 text-sm mt-3">across {wallets.length} wallet{wallets.length === 1 ? '' : 's'}</p>
              {ratesStale && <p className="text-amber-400 text-xs mt-2">Using the last saved exchange rates</p>}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 sm:gap-5 mt-12 sm:mt-14 items-stretch">
          <a href="/wallets" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors rounded-2xl p-5 sm:p-7 min-h-[140px] flex flex-col justify-between">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Wallets</p>
            <div>
              <p className="text-white text-2xl font-bold">{wallets.length}</p>
              <p className="text-zinc-400 text-sm mt-1">Manage accounts</p>
            </div>
          </a>
          <a href="/reports" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors rounded-2xl p-5 sm:p-7 min-h-[140px] flex flex-col justify-between">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Weekly report</p>
            <div>
              <p className="text-white text-2xl font-bold">Insights</p>
              <p className="text-zinc-400 text-sm mt-1">Generate this week</p>
            </div>
          </a>
        </section>

        <section className="mt-12 sm:mt-14">
          <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4">Recent activity</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 sm:px-7 py-2 sm:py-3">
            {recentTransactions.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-8">No transactions yet. <a href="/wallets" className="text-green-400 hover:text-green-300">Add a wallet</a> to get started.</p>
            ) : (
              recentTransactions.map(function (t, i) {
                const credit = t.type === 'credit'
                const when = new Date(t.transaction_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                return (
                  <div key={t.id} className={'flex justify-between items-center gap-3 py-5 ' + (i === recentTransactions.length - 1 ? '' : 'border-b border-zinc-800')}>
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={'w-11 h-11 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ' + (credit ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400')}>
                        {credit ? '\u2193' : '\u2191'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium truncate">{t.description || t.category || 'Transaction'}</div>
                        <div className="text-zinc-500 text-xs mt-1">{when}</div>
                      </div>
                    </div>
                    <div className={'font-bold text-sm tabular-nums flex-shrink-0 ' + (credit ? 'text-green-400' : 'text-rose-400')}>
                      {credit ? '+' : '-'}{Number(t.amount).toLocaleString()}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <a href="/transactions" className="block text-center text-green-400 hover:text-green-300 text-sm font-semibold mt-6">View all transactions</a>
        </section>
      </main>
    </div>
  )
}
