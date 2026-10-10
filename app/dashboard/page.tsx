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

      const ratesRes = await fetch('/api/exchange-rates')
      const ratesData = await ratesRes.json()
      setRates(ratesData.rates || [])

      setCheckingAuth(false)
    })
  }, [])

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

  const currencySymbol: any = { NGN: '\u20A6', USD: '$', EUR: '\u20AC', GBP: '\u00A3' }
  const totalInHomeCurrency = wallets.reduce(function (sum, w) { return sum + convertToHome(Number(w.balance), w.currency) }, 0)

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-500 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="mt-10 text-center">
          <p className="text-zinc-500 text-xs">Total balance</p>
          <p className="text-white text-5xl font-extrabold mt-2 tracking-tight tabular-nums">
            {currencySymbol[homeCurrency] || ''}{totalInHomeCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-zinc-600 text-xs mt-2">across {wallets.length} wallet{wallets.length === 1 ? '' : 's'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <a href="/wallets" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-2xl p-5">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Wallets</p>
            <p className="text-white text-2xl font-bold mt-2">{wallets.length}</p>
          </a>
          <a href="/reports" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-2xl p-5">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Weekly Report</p>
            <p className="text-white text-sm font-semibold mt-2">Generate now</p>
          </a>
        </div>

        <p className="text-zinc-600 text-xs font-bold uppercase tracking-wider mt-10 mb-3.5">Recent activity</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {recentTransactions.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-4">No transactions yet. <a href="/wallets" className="text-emerald-400 hover:text-emerald-300">Add a wallet</a> to get started.</p>
          ) : (
            recentTransactions.map(function (t, i) {
              const credit = t.type === 'credit'
              return (
                <div key={t.id} className={'flex justify-between items-center py-3.5 ' + (i === recentTransactions.length - 1 ? '' : 'border-b border-zinc-800')}>
                  <div className="flex items-center gap-3">
                    <div className={'w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ' + (credit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                      {credit ? '\u2193' : '\u2191'}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{t.description || t.category || 'Transaction'}</div>
                      <div className="text-zinc-600 text-xs mt-0.5">{new Date(t.transaction_time).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={'font-bold text-sm tabular-nums flex-shrink-0 ' + (credit ? 'text-emerald-400' : 'text-rose-400')}>
                    {credit ? '+' : '-'}{Number(t.amount).toLocaleString()}
                  </div>
                </div>
              )
            })
          )}
          <a href="/transactions" className="block text-center text-emerald-400 hover:text-emerald-300 text-sm font-semibold mt-4 pt-4 border-t border-zinc-800">View all transactions</a>
        </div>
      </div>
    </div>
  )
}
