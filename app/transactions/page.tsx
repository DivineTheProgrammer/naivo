'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Nav from '../components/Nav'

const CATEGORIES = ['salary', 'food', 'shopping', 'transport', 'bills', 'entertainment', 'other']

const ICONS: any = {
  salary: '\uD83D\uDCB5',
  food: '\uD83C\uDF54',
  shopping: '\uD83D\uDED2',
  transport: '\uD83D\uDE8C',
  bills: '\uD83E\uDDFE',
  entertainment: '\uD83C\uDFAC',
  other: '\uD83D\uDCE6',
}

export default function Transactions() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [wallets, setWallets] = useState<any[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddTx, setShowAddTx] = useState(false)

  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType] = useState('debit')
  const [txDescription, setTxDescription] = useState('')
  const [txCategory, setTxCategory] = useState('other')

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      if (!result.data.user) {
        router.push('/login')
        return
      }

      const walletsRes = await fetch('/api/wallets')
      const walletsData = await walletsRes.json()
      setWallets(walletsData.wallets || [])

      const urlWalletId = searchParams.get('walletId')
      const initialWalletId = urlWalletId || (walletsData.wallets && walletsData.wallets.length > 0 ? walletsData.wallets[0].id : null)

      if (initialWalletId) {
        setSelectedWalletId(initialWalletId)
        loadTransactions(initialWalletId)
      }

      setCheckingAuth(false)
    })
  }, [])

  const loadTransactions = async (walletId: string) => {
    const res = await fetch('/api/transactions?walletId=' + walletId)
    const data = await res.json()
    setTransactions(data.transactions || [])
  }

  const handleAddTransaction = async () => {
    if (!selectedWalletId || !txAmount) return
    await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletId: selectedWalletId, amount: parseFloat(txAmount), type: txType, description: txDescription, category: txCategory }) })
    setTxAmount('')
    setTxDescription('')
    setTxCategory('other')
    setShowAddTx(false)
    loadTransactions(selectedWalletId)
  }

  const isLocked = function (lockedUntil: string | null) {
    if (!lockedUntil) return false
    return new Date(lockedUntil).getTime() > Date.now()
  }

  const timeRemaining = function (lockedUntil: string) {
    const ms = new Date(lockedUntil).getTime() - Date.now()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return hours + 'h ' + minutes + 'm'
  }

  const iconFor = function (category: string) {
    return ICONS[category] || ICONS.other
  }

  const displayName = function (name: string) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const selectedWallet = wallets.find(function (w) { return w.id === selectedWalletId })

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="flex justify-between items-center mt-10">
          <h1 className="text-white text-2xl font-bold">Transactions</h1>
          <button onClick={function () { setShowAddTx(!showAddTx) }} disabled={!selectedWalletId} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors text-black font-bold text-sm rounded-lg">+ Add</button>
        </div>

        {wallets.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mt-6 pb-1">
            {wallets.map(function (w) {
              const active = w.id === selectedWalletId
              const pillClass = 'px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors border ' + (active ? 'bg-emerald-600 border-emerald-600 text-black' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500')
              return <button key={w.id} onClick={function () { setSelectedWalletId(w.id); loadTransactions(w.id) }} className={pillClass}>{displayName(w.name)}</button>
            })}
          </div>
        )}

        {showAddTx && selectedWallet && (
          <div className="mt-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-white text-sm font-semibold">New transaction for {displayName(selectedWallet.name)}</h3>
            <div className="mt-3.5 flex flex-col gap-2.5">
              <input value={txAmount} onChange={function (e) { setTxAmount(e.target.value) }} placeholder="Amount" type="number" className="w-full px-3.5 py-2.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-sm outline-none focus:border-emerald-600 transition-colors" />
              <select value={txType} onChange={function (e) { setTxType(e.target.value) }} className="w-full px-3.5 py-2.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-sm outline-none">
                <option value="debit">Debit (money out)</option>
                <option value="credit">Credit (money in)</option>
              </select>
              <select value={txCategory} onChange={function (e) { setTxCategory(e.target.value) }} className="w-full px-3.5 py-2.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-sm outline-none capitalize">
                {CATEGORIES.map(function (c) { return <option key={c} value={c}>{displayName(c)}</option> })}
              </select>
              <input value={txDescription} onChange={function (e) { setTxDescription(e.target.value) }} placeholder="Description (optional)" className="w-full px-3.5 py-2.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-sm outline-none focus:border-emerald-600 transition-colors" />
            </div>
            <div className="flex gap-2.5 mt-4">
              <button onClick={handleAddTransaction} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg">Save</button>
              <button onClick={function () { setShowAddTx(false) }} className="px-5 py-2.5 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm font-semibold rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {transactions.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-10">No transactions yet.</p>
          ) : (
            transactions.map(function (t, i) {
              const locked = isLocked(t.locked_until)
              const credit = t.type === 'credit'
              return (
                <div key={t.id} className={'flex justify-between items-center py-4 ' + (i === transactions.length - 1 ? '' : 'border-b border-zinc-800')}>
                  <div className="flex items-center gap-3">
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ' + (credit ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400')}>
                      {t.category ? iconFor(t.category) : (credit ? '\u2193' : '\u2191')}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{t.description || displayName(t.category || 'transaction')}</div>
                      {t.category && <div className="text-zinc-400 text-xs mt-0.5 capitalize">{t.category}</div>}
                      <div className="text-zinc-500 text-xs mt-0.5">{new Date(t.transaction_time).toLocaleString()}</div>
                      {locked && <div className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[0.65rem] font-semibold mt-1">Locked {timeRemaining(t.locked_until)}</div>}
                    </div>
                  </div>
                  <div className={'font-bold text-sm tabular-nums flex-shrink-0 ' + (credit ? 'text-green-400' : 'text-rose-400')}>
                    {credit ? '+' : '-'}{selectedWallet ? selectedWallet.currency : ''} {Number(t.amount).toLocaleString()}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
