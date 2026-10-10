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

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-500 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="flex justify-between items-center mt-8">
          <h1 className="text-white text-2xl font-bold">Wallets</h1>
          <button onClick={function () { setShowAddWallet(!showAddWallet) }} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-xl">+ Add Wallet</button>
        </div>

        {showAddWallet && (
          <div className="mt-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-white text-sm font-semibold">New wallet</h3>
            <div className="mt-3.5 flex flex-col gap-2.5">
              <input value={newWalletName} onChange={function (e) { setNewWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" className="w-full px-3.5 py-2.5 rounded-xl bg-[#121615] border border-zinc-800 text-white text-sm outline-none focus:border-emerald-600 transition-colors" />
              <input value={newWalletProvider} onChange={function (e) { setNewWalletProvider(e.target.value) }} placeholder="Provider (optional)" className="w-full px-3.5 py-2.5 rounded-xl bg-[#121615] border border-zinc-800 text-white text-sm outline-none focus:border-emerald-600 transition-colors" />
              <select value={newWalletCurrency} onChange={function (e) { setNewWalletCurrency(e.target.value) }} className="w-full px-3.5 py-2.5 rounded-xl bg-[#121615] border border-zinc-800 text-white text-sm outline-none">
                <option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="flex gap-2.5 mt-4">
              <button onClick={handleAddWallet} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-xl">Add Wallet</button>
              <button onClick={function () { setShowAddWallet(false) }} className="px-5 py-2.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-semibold rounded-xl">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {wallets.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">No wallets yet. Add your first one above.</p>
          ) : (
            wallets.map(function (w) {
              return (
                <a key={w.id} href={'/transactions?walletId=' + w.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <h3 className="text-white text-base font-semibold">{w.name}</h3>
                    {w.provider && <p className="text-zinc-600 text-xs mt-0.5">{w.provider}</p>}
                  </div>
                  <p className="text-emerald-400 text-lg font-bold tabular-nums">{w.currency} {Number(w.balance).toLocaleString()}</p>
                </a>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
