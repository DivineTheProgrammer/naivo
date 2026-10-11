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

  const currencySymbol: any = { NGN: '\u20A6', USD: '$', EUR: '\u20AC', GBP: '\u00A3' }

  const formatMoney = function (amount: number, currency: string) {
    const sign = amount < 0 ? '-' : ''
    const symbol = currencySymbol[currency] || ''
    return sign + symbol + Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })
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

  const totalInHomeCurrency = wallets.reduce(function (sum, w) { return sum + convertToHome(Number(w.balance), w.currency) }, 0)
  const totalIsNegative = totalInHomeCurrency < 0

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="mt-12 text-center">
          <p className="text-zinc-400 text-sm font-medium">Total balance</p>
          <p className={'text-5xl font-extrabold mt-2 tracking-tight tabular-nums ' + (totalIsNegative ? 'text-rose-400' : 'text-white')}>
            {formatMoney(totalInHomeCurrency, homeCurrency)}
          </p>
          <p className="text-zinc-400 text-sm mt-2">across {wallets.length} wallet{wallets.length === 1 ? '' : 's'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10 items-stretch">
          <a href="/wallets" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors rounded-2xl p-6 min-h-[130px] flex flex-col justify-between">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Wallets</p>
            <div>
              <p className="text-white text-2xl font-bold">{wallets.length}</p>
              <p className="text-zinc-400 text-sm mt-1">Manage accounts</p>
            </div>
          </a>
          <a href="/reports" className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors rounded-2xl p-6 min-h-[130px] flex flex-col justify-between">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Weekly report</p>
            <div>
              <p className="text-white text-2xl font-bold">Insights</p>
              <p className="text-zinc-400 text-sm mt-1">Generate this week</p>
            </div>
          </a>
        </div>

        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-12 mb-4">Recent activity</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {recentTransactions.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-4">No transactions yet. <a href="/wallets" className="text-green-400 hover:text-green-300">Add a wallet</a> to get started.</p>
          ) : (
            recentTransactions.map(function (t, i) {
              const credit = t.type === 'credit'
              return (
                <div key={t.id} className={'flex justify-between items-center py-4 ' + (i === recentTransactions.length - 1 ? '' : 'border-b border-zinc-800')}>
                  <div className="flex items-center gap-3">
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ' + (credit ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400')}>
                      {credit ? '\u2193' : '\u2191'}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{t.description || t.category || 'Transaction'}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">{new Date(t.transaction_time).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={'font-bold text-sm tabular-nums flex-shrink-0 ' + (credit ? 'text-green-400' : 'text-rose-400')}>
                    {credit ? '+' : '-'}{Number(t.amount).toLocaleString()}
                  </div>
                </div>
              )
            })
          )}
          <a href="/transactions" className="block text-center text-green-400 hover:text-green-300 text-sm font-semibold mt-4 pt-4 border-t border-zinc-800">View all transactions</a>
        </div>
      </div>
    </div>
  )
}
