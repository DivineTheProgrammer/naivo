'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Nav from '../components/Nav'

export default function Wallets() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [wallets, setWallets] = useState<any[]>([])
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletProvider, setNewWalletProvider] = useState('')
  const [newWalletCurrency, setNewWalletCurrency] = useState('NGN')

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      if (!result.data.user) {
        router.push('/login')
        return
      }
      loadWallets()
      setCheckingAuth(false)
    })
  }, [])

  const loadWallets = async () => {
    const res = await fetch('/api/wallets')
    const data = await res.json()
    setWallets(data.wallets || [])
  }

  const handleAddWallet = async () => {
    if (!newWalletName) return
    await fetch('/api/wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newWalletName, provider: newWalletProvider, currency: newWalletCurrency }) })
    setNewWalletName('')
    setNewWalletProvider('')
    setNewWalletCurrency('NGN')
    setShowAddWallet(false)
    loadWallets()
  }

  const displayName = function (name: string) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const formatBalance = function (amount: number, currency: string) {
    const sign = amount < 0 ? '-' : ''
    return sign + currency + ' ' + Math.abs(amount).toLocaleString()
  }

  const inputClass = 'w-full px-4 py-3 rounded-lg bg-[#121615] border border-zinc-800 text-white text-base sm:text-sm outline-none focus:border-emerald-600 transition-colors'

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32 md:pb-20">
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-white text-2xl sm:text-3xl font-bold">Wallets</h1>
          <button onClick={function () { setShowAddWallet(!showAddWallet) }} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg flex-shrink-0">+ Add wallet</button>
        </div>

        {showAddWallet && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-white text-base font-semibold">New wallet</h2>
            <div className="mt-5 flex flex-col gap-4">
              <input value={newWalletName} onChange={function (e) { setNewWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" className={inputClass} />
              <input value={newWalletProvider} onChange={function (e) { setNewWalletProvider(e.target.value) }} placeholder="Provider (optional)" className={inputClass} />
              <select value={newWalletCurrency} onChange={function (e) { setNewWalletCurrency(e.target.value) }} className={inputClass}>
                <option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddWallet} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg">Add wallet</button>
              <button onClick={function () { setShowAddWallet(false) }} className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm font-semibold rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-4">
          {wallets.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-12">No wallets yet. Add your first one above.</p>
          ) : (
            wallets.map(function (w) {
              return (
                <a key={w.id} href={'/transactions?walletId=' + w.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60 transition-colors rounded-2xl p-5 sm:p-7 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-600/15 text-emerald-400 font-bold text-lg flex items-center justify-center flex-shrink-0">
                      {displayName(w.name).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white text-base font-semibold truncate">{displayName(w.name)}</h3>
                      {w.provider && <p className="text-zinc-400 text-xs mt-1 truncate">{w.provider}</p>}
                    </div>
                  </div>
                  <p className={'text-base sm:text-lg font-bold tabular-nums flex-shrink-0 ' + (Number(w.balance) < 0 ? 'text-rose-400' : 'text-green-400')}>{formatBalance(Number(w.balance), w.currency)}</p>
                </a>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
